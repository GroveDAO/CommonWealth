// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ImpactAttestation
/// @notice Retroactive funding with attester quorum and treasury-backed rewards.
contract ImpactAttestation is AccessControl, ReentrancyGuard {
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");

    struct Attestation {
        uint256 id;
        address contributor;
        string proofURI;
        string descriptionURI;
        uint256 requestedReward;
        uint256 confirmations;
        uint256 rejections;
        bool rewarded;
        bool rejected;
        uint256 submittedAt;
    }

    uint256 public immutable reviewWindow;
    uint256 public approvalThreshold;
    uint256 public rejectionThreshold;
    uint256 public count;
    uint256 public treasury;

    mapping(uint256 => Attestation) public attestations;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => uint256) public reputation;

    event Submitted(uint256 indexed id, address indexed contributor, string proofURI, uint256 reward);
    event Confirmed(uint256 indexed id, address indexed attester, uint256 total);
    event Rejected(uint256 indexed id, address indexed attester, uint256 total);
    event Rewarded(uint256 indexed id, address indexed contributor, uint256 amount);
    event ThresholdsUpdated(uint256 approvalThreshold, uint256 rejectionThreshold);
    event TreasuryFunded(address indexed funder, uint256 amount, uint256 newBalance);

    error AlreadyRewarded();
    error AlreadyVoted();
    error InvalidAttestation();
    error InvalidThreshold();
    error InvalidURI();
    error NotEligible();
    error WindowExpired();
    error ZeroAmount();

    constructor(uint256 approvalThreshold_, uint256 rejectionThreshold_, uint256 reviewWindow_) {
        if (approvalThreshold_ == 0 || rejectionThreshold_ == 0) revert InvalidThreshold();
        if (reviewWindow_ == 0) revert InvalidThreshold();

        approvalThreshold = approvalThreshold_;
        rejectionThreshold = rejectionThreshold_;
        reviewWindow = reviewWindow_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ATTESTER_ROLE, msg.sender);
    }

    function submit(
        string calldata proofURI,
        string calldata descriptionURI,
        uint256 reward
    ) external returns (uint256 attestationId) {
        if (bytes(proofURI).length == 0 || bytes(descriptionURI).length == 0) revert InvalidURI();
        if (reward == 0) revert ZeroAmount();

        attestationId = ++count;
        attestations[attestationId] = Attestation({
            id: attestationId,
            contributor: msg.sender,
            proofURI: proofURI,
            descriptionURI: descriptionURI,
            requestedReward: reward,
            confirmations: 0,
            rejections: 0,
            rewarded: false,
            rejected: false,
            submittedAt: block.timestamp
        });

        emit Submitted(attestationId, msg.sender, proofURI, reward);
    }

    function confirm(uint256 attestationId) external onlyRole(ATTESTER_ROLE) {
        Attestation storage attestation = _activeAttestation(attestationId);
        if (block.timestamp > attestation.submittedAt + reviewWindow) revert WindowExpired();
        if (hasVoted[attestationId][msg.sender]) revert AlreadyVoted();

        hasVoted[attestationId][msg.sender] = true;
        attestation.confirmations += 1;

        emit Confirmed(attestationId, msg.sender, attestation.confirmations);
    }

    function reject(uint256 attestationId) external onlyRole(ATTESTER_ROLE) {
        Attestation storage attestation = _activeAttestation(attestationId);
        if (hasVoted[attestationId][msg.sender]) revert AlreadyVoted();

        hasVoted[attestationId][msg.sender] = true;
        attestation.rejections += 1;
        if (attestation.rejections >= rejectionThreshold) {
            attestation.rejected = true;
        }

        emit Rejected(attestationId, msg.sender, attestation.rejections);
    }

    function claim(uint256 attestationId) external nonReentrant {
        Attestation storage attestation = _activeAttestation(attestationId);
        require(attestation.contributor == msg.sender, "Forbidden");
        if (attestation.confirmations < approvalThreshold || attestation.rejected) revert NotEligible();
        if (treasury < attestation.requestedReward) revert NotEligible();

        attestation.rewarded = true;
        treasury -= attestation.requestedReward;
        reputation[msg.sender] += attestation.requestedReward;

        payable(msg.sender).transfer(attestation.requestedReward);

        emit Rewarded(attestationId, msg.sender, attestation.requestedReward);
    }

    function addAttester(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ATTESTER_ROLE, account);
    }

    function removeAttester(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ATTESTER_ROLE, account);
    }

    function setThresholds(uint256 approvalThreshold_, uint256 rejectionThreshold_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (approvalThreshold_ == 0 || rejectionThreshold_ == 0) revert InvalidThreshold();
        approvalThreshold = approvalThreshold_;
        rejectionThreshold = rejectionThreshold_;

        emit ThresholdsUpdated(approvalThreshold_, rejectionThreshold_);
    }

    function fundTreasury() external payable {
        _fundTreasury(msg.sender, msg.value);
    }

    function _activeAttestation(uint256 attestationId) internal view returns (Attestation storage attestation) {
        attestation = attestations[attestationId];
        if (attestation.id == 0) revert InvalidAttestation();
        if (attestation.rewarded) revert AlreadyRewarded();
    }

    function _fundTreasury(address funder, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();

        treasury += amount;
        emit TreasuryFunded(funder, amount, treasury);
    }

    receive() external payable {
        _fundTreasury(msg.sender, msg.value);
    }
}
