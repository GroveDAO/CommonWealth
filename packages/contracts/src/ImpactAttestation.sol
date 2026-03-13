// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ImpactAttestation
/// @notice EAS-compatible retroactive funding with Filecoin CID proofs and attester quorum
contract ImpactAttestation is AccessControl, ReentrancyGuard {
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");
    uint256 public constant THRESHOLD = 3;
    uint256 public constant WINDOW = 14 days;

    struct Attestation {
        uint256 id;
        address contributor;
        string proofCID;
        string descriptionCID;
        uint256 requestedReward;
        uint256 confirmations;
        uint256 rejections;
        bool rewarded;
        bool rejected;
        uint256 submittedAt;
        mapping(address => bool) voted;
    }

    uint256 public count;
    mapping(uint256 => Attestation) public attestations;
    mapping(address => uint256) public reputation;
    uint256 public treasury;

    event Submitted(uint256 indexed id, address indexed contributor, string proofCID, uint256 reward);
    event Confirmed(uint256 indexed id, address indexed attester, uint256 total);
    event Rejected(uint256 indexed id, address indexed attester, uint256 total);
    event Rewarded(uint256 indexed id, address indexed contributor, uint256 amount);

    error AlreadyVoted();
    error WindowExpired();
    error NotEligible();
    error AlreadyRewarded();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ATTESTER_ROLE, msg.sender);
    }

    /// @notice Submit a new impact attestation
    function submit(string calldata _proof, string calldata _desc, uint256 _reward) external returns (uint256) {
        uint256 id = ++count;
        Attestation storage a = attestations[id];
        a.id = id;
        a.contributor = msg.sender;
        a.proofCID = _proof;
        a.descriptionCID = _desc;
        a.requestedReward = _reward;
        a.submittedAt = block.timestamp;
        emit Submitted(id, msg.sender, _proof, _reward);
        return id;
    }

    /// @notice Confirm an attestation (attester only)
    function confirm(uint256 _id) external onlyRole(ATTESTER_ROLE) {
        Attestation storage a = attestations[_id];
        if (a.voted[msg.sender]) revert AlreadyVoted();
        if (block.timestamp > a.submittedAt + WINDOW) revert WindowExpired();
        if (a.rewarded) revert AlreadyRewarded();
        a.voted[msg.sender] = true;
        a.confirmations++;
        emit Confirmed(_id, msg.sender, a.confirmations);
    }

    /// @notice Reject an attestation (attester only)
    function reject(uint256 _id) external onlyRole(ATTESTER_ROLE) {
        Attestation storage a = attestations[_id];
        if (a.voted[msg.sender]) revert AlreadyVoted();
        a.voted[msg.sender] = true;
        a.rejections++;
        if (a.rejections > THRESHOLD) a.rejected = true;
        emit Rejected(_id, msg.sender, a.rejections);
    }

    /// @notice Claim reward for a confirmed attestation
    function claim(uint256 _id) external nonReentrant {
        Attestation storage a = attestations[_id];
        require(a.contributor == msg.sender, "Forbidden");
        if (a.rewarded) revert AlreadyRewarded();
        if (a.rejected || a.confirmations < THRESHOLD) revert NotEligible();
        require(treasury >= a.requestedReward, "Low funds");
        a.rewarded = true;
        treasury -= a.requestedReward;
        reputation[msg.sender] += a.requestedReward;
        payable(msg.sender).transfer(a.requestedReward);
        emit Rewarded(_id, msg.sender, a.requestedReward);
    }

    /// @notice Add an attester
    function addAttester(address _a) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ATTESTER_ROLE, _a);
    }

    /// @notice Remove an attester
    function removeAttester(address _a) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ATTESTER_ROLE, _a);
    }

    receive() external payable {
        treasury += msg.value;
    }
}
