// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ConvictionVoting
/// @notice Time-weighted governance using conviction voting mechanism
contract ConvictionVoting is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable governanceToken;
    uint256 public constant ALPHA_NUM = 9;
    uint256 public constant ALPHA_DEN = 10;
    uint256 public constant THRESHOLD_PCT = 10;
    uint256 public constant MIN_VOTING_PERIOD = 3 days;

    struct Proposal {
        uint256 id;
        address proposer;
        string metadataCID;
        uint256 requestedAmount;
        address payable beneficiary;
        uint256 convictionLast;
        uint256 blockLast;
        bool executed;
        bool cancelled;
        uint256 createdAt;
    }

    struct VoterState {
        uint256 amount;
        uint256 convictionLast;
        uint256 blockLast;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => VoterState)) public voterStates;
    mapping(uint256 => uint256) public totalConviction;
    uint256 public fundBalance;

    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string metadataCID,
        uint256 requestedAmount
    );
    event ConvictionUpdated(uint256 indexed proposalId, address indexed voter, uint256 conviction);
    event ProposalExecuted(uint256 indexed id, address indexed beneficiary, uint256 amount);
    event ProposalCancelled(uint256 indexed id);

    error ProposalNotFound();
    error AlreadyExecuted();
    error Cancelled();
    error InsufficientConviction();
    error InsufficientFunds();
    error VotingPeriodNotElapsed();

    constructor(address _token) Ownable(msg.sender) {
        governanceToken = IERC20(_token);
    }

    /// @notice Create a new funding proposal
    function createProposal(string calldata _cid, uint256 _amount, address payable _beneficiary)
        external
        whenNotPaused
        returns (uint256)
    {
        uint256 id = ++proposalCount;
        proposals[id] = Proposal({
            id: id,
            proposer: msg.sender,
            metadataCID: _cid,
            requestedAmount: _amount,
            beneficiary: _beneficiary,
            convictionLast: 0,
            blockLast: block.number,
            executed: false,
            cancelled: false,
            createdAt: block.timestamp
        });
        emit ProposalCreated(id, msg.sender, _cid, _amount);
        return id;
    }

    /// @notice Stake tokens on a proposal to build conviction
    function stakeOnProposal(uint256 _id, uint256 _amount) external nonReentrant whenNotPaused {
        _active(_id);
        governanceToken.transferFrom(msg.sender, address(this), _amount);
        _updateConviction(_id, msg.sender);
        voterStates[_id][msg.sender].amount += _amount;
        voterStates[_id][msg.sender].blockLast = block.number;
        emit ConvictionUpdated(_id, msg.sender, voterStates[_id][msg.sender].convictionLast);
    }

    /// @notice Withdraw staked tokens from a proposal
    function withdrawStake(uint256 _id, uint256 _amount) external nonReentrant {
        VoterState storage v = voterStates[_id][msg.sender];
        require(v.amount >= _amount, "Insufficient stake");
        _updateConviction(_id, msg.sender);
        v.amount -= _amount;
        governanceToken.transfer(msg.sender, _amount);
    }

    /// @notice Execute a proposal that has reached conviction threshold
    function executeProposal(uint256 _id) external nonReentrant whenNotPaused {
        Proposal storage p = _active(_id);
        if (block.timestamp < p.createdAt + MIN_VOTING_PERIOD) revert VotingPeriodNotElapsed();
        if (totalConviction[_id] < governanceToken.totalSupply() * THRESHOLD_PCT / 100) revert InsufficientConviction();
        if (fundBalance < p.requestedAmount) revert InsufficientFunds();
        p.executed = true;
        fundBalance -= p.requestedAmount;
        p.beneficiary.transfer(p.requestedAmount);
        emit ProposalExecuted(_id, p.beneficiary, p.requestedAmount);
    }

    /// @notice Cancel a proposal (proposer or owner only)
    function cancelProposal(uint256 _id) external {
        Proposal storage p = proposals[_id];
        require(p.proposer == msg.sender || owner() == msg.sender, "Forbidden");
        p.cancelled = true;
        emit ProposalCancelled(_id);
    }

    /// @notice Calculate current conviction for a voter on a proposal
    function getCurrentConviction(uint256 _id, address _voter) public view returns (uint256) {
        VoterState memory v = voterStates[_id][_voter];
        if (v.amount == 0) return v.convictionLast;
        uint256 c = v.convictionLast;
        uint256 blocks = block.number - v.blockLast;
        for (uint256 i = 0; i < blocks; i++) {
            c = c * ALPHA_NUM / ALPHA_DEN + v.amount;
        }
        return c;
    }

    function _updateConviction(uint256 _id, address _voter) internal {
        VoterState storage v = voterStates[_id][_voter];
        uint256 newC = getCurrentConviction(_id, _voter);
        totalConviction[_id] += newC - v.convictionLast;
        v.convictionLast = newC;
        v.blockLast = block.number;
    }

    function _active(uint256 _id) internal view returns (Proposal storage p) {
        p = proposals[_id];
        if (p.id == 0) revert ProposalNotFound();
        if (p.executed) revert AlreadyExecuted();
        if (p.cancelled) revert Cancelled();
    }

    /// @notice Deposit ETH into the fund
    function deposit() external payable {
        fundBalance += msg.value;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {
        fundBalance += msg.value;
    }
}
