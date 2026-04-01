// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ConvictionVoting
/// @notice Time-weighted treasury governance for community grant proposals.
contract ConvictionVoting is Ownable, Pausable, ReentrancyGuard {
    uint256 public constant BASE_THRESHOLD_BPS = 500;
    uint256 public constant MIN_VOTING_PERIOD = 3 days;

    struct Proposal {
        uint256 id;
        address proposer;
        string metadataURI;
        uint256 requestedAmount;
        address payable beneficiary;
        uint256 conviction;
        uint256 totalStaked;
        uint256 lastUpdatedBlock;
        bool executed;
        bool cancelled;
        uint256 createdAt;
    }

    IERC20 public immutable governanceToken;
    uint256 public proposalCount;
    uint256 public fundBalance;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => uint256)) public stakes;

    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string metadataURI,
        uint256 requestedAmount,
        address beneficiary
    );
    event StakeChanged(
        uint256 indexed proposalId,
        address indexed voter,
        uint256 previousStake,
        uint256 newStake,
        uint256 currentConviction
    );
    event ProposalExecuted(uint256 indexed id, address indexed beneficiary, uint256 amount);
    event ProposalCancelled(uint256 indexed id);
    event TreasuryFunded(address indexed funder, uint256 amount, uint256 newBalance);

    error AlreadyExecuted();
    error Cancelled();
    error InsufficientConviction();
    error InsufficientFunds();
    error InvalidBeneficiary();
    error InvalidMetadata();
    error InvalidProposal();
    error VotingPeriodNotElapsed();
    error ZeroAmount();

    constructor(address token_) Ownable(msg.sender) {
        if (token_ == address(0)) revert InvalidBeneficiary();
        governanceToken = IERC20(token_);
    }

    function createProposal(
        string calldata metadataURI,
        uint256 requestedAmount,
        address payable beneficiary
    ) external whenNotPaused returns (uint256 proposalId) {
        if (bytes(metadataURI).length == 0) revert InvalidMetadata();
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (requestedAmount == 0) revert ZeroAmount();

        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            metadataURI: metadataURI,
            requestedAmount: requestedAmount,
            beneficiary: beneficiary,
            conviction: 0,
            totalStaked: 0,
            lastUpdatedBlock: block.number,
            executed: false,
            cancelled: false,
            createdAt: block.timestamp
        });

        emit ProposalCreated(proposalId, msg.sender, metadataURI, requestedAmount, beneficiary);
    }

    function stakeOnProposal(uint256 proposalId, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        Proposal storage proposal = _activeProposal(proposalId);
        governanceToken.transferFrom(msg.sender, address(this), amount);

        _accrue(proposal);

        uint256 previousStake = stakes[proposalId][msg.sender];
        uint256 newStake = previousStake + amount;

        stakes[proposalId][msg.sender] = newStake;
        proposal.totalStaked += amount;

        emit StakeChanged(proposalId, msg.sender, previousStake, newStake, proposal.conviction);
    }

    function withdrawStake(uint256 proposalId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        Proposal storage proposal = _activeProposal(proposalId);
        uint256 currentStake = stakes[proposalId][msg.sender];
        require(currentStake >= amount, "Insufficient stake");

        _accrue(proposal);

        uint256 newStake = currentStake - amount;
        stakes[proposalId][msg.sender] = newStake;
        proposal.totalStaked -= amount;

        governanceToken.transfer(msg.sender, amount);

        emit StakeChanged(proposalId, msg.sender, currentStake, newStake, proposal.conviction);
    }

    function executeProposal(uint256 proposalId) external nonReentrant whenNotPaused {
        Proposal storage proposal = _activeProposal(proposalId);

        if (block.timestamp < proposal.createdAt + MIN_VOTING_PERIOD) {
            revert VotingPeriodNotElapsed();
        }

        _accrue(proposal);

        if (proposal.conviction < convictionThreshold(proposalId)) revert InsufficientConviction();
        if (fundBalance < proposal.requestedAmount) revert InsufficientFunds();

        proposal.executed = true;
        fundBalance -= proposal.requestedAmount;
        proposal.beneficiary.transfer(proposal.requestedAmount);

        emit ProposalExecuted(proposalId, proposal.beneficiary, proposal.requestedAmount);
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert InvalidProposal();
        require(proposal.proposer == msg.sender || owner() == msg.sender, "Forbidden");
        if (proposal.executed) revert AlreadyExecuted();
        proposal.cancelled = true;

        emit ProposalCancelled(proposalId);
    }

    function convictionThreshold(uint256 proposalId) public view returns (uint256) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert InvalidProposal();

        uint256 totalSupply = governanceToken.totalSupply();
        uint256 baseThreshold = totalSupply * BASE_THRESHOLD_BPS / 10_000;
        uint256 treasuryBalance = fundBalance == 0 ? 1 ether : fundBalance;
        uint256 requestedShareBps = proposal.requestedAmount * 10_000 / treasuryBalance;

        return baseThreshold + (baseThreshold * requestedShareBps / 10_000);
    }

    function getCurrentConviction(uint256 proposalId) public view returns (uint256) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert InvalidProposal();

        uint256 blocksElapsed = block.number - proposal.lastUpdatedBlock;
        return proposal.conviction + proposal.totalStaked * blocksElapsed;
    }

    function deposit() external payable {
        _fundTreasury(msg.sender, msg.value);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _activeProposal(uint256 proposalId) internal view returns (Proposal storage proposal) {
        proposal = proposals[proposalId];
        if (proposal.id == 0) revert InvalidProposal();
        if (proposal.executed) revert AlreadyExecuted();
        if (proposal.cancelled) revert Cancelled();
    }

    function _accrue(Proposal storage proposal) internal {
        proposal.conviction = getCurrentConviction(proposal.id);
        proposal.lastUpdatedBlock = block.number;
    }

    function _fundTreasury(address funder, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();

        fundBalance += amount;
        emit TreasuryFunded(funder, amount, fundBalance);
    }

    receive() external payable {
        _fundTreasury(msg.sender, msg.value);
    }
}
