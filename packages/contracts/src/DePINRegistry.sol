// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DePINRegistry
/// @notice Oracle-reviewed infrastructure data contributions with token rewards.
contract DePINRegistry is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    enum DataType {
        Environmental,
        Infrastructure,
        Compute,
        Storage,
        Bandwidth
    }

    struct Submission {
        uint256 id;
        address contributor;
        string metadataURI;
        string accessURI;
        DataType dataType;
        uint256 reward;
        bool verified;
        bool claimed;
        uint256 submittedAt;
        uint256 quality;
    }

    IERC20 public immutable rewardToken;
    uint256 public count;

    mapping(uint256 => Submission) public submissions;
    mapping(address => uint256) public score;
    mapping(DataType => uint256) public baseReward;

    event Submitted(uint256 indexed id, address indexed contributor, DataType dataType);
    event Verified(uint256 indexed id, uint256 quality, uint256 reward);
    event Claimed(uint256 indexed id, address indexed contributor, uint256 reward);
    event BaseRewardUpdated(DataType indexed dataType, uint256 reward);

    error AlreadyVerified();
    error CannotClaim();
    error InvalidQuality();
    error InvalidSubmission();
    error InvalidURI();

    constructor(address rewardToken_) {
        require(rewardToken_ != address(0), "Invalid token");

        rewardToken = IERC20(rewardToken_);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);

        baseReward[DataType.Environmental] = 10 ether;
        baseReward[DataType.Infrastructure] = 15 ether;
        baseReward[DataType.Compute] = 20 ether;
        baseReward[DataType.Storage] = 8 ether;
        baseReward[DataType.Bandwidth] = 5 ether;
    }

    function submit(
        string calldata metadataURI,
        string calldata accessURI,
        DataType dataType
    ) external returns (uint256 submissionId) {
        if (bytes(metadataURI).length == 0 || bytes(accessURI).length == 0) revert InvalidURI();

        submissionId = ++count;
        submissions[submissionId] = Submission({
            id: submissionId,
            contributor: msg.sender,
            metadataURI: metadataURI,
            accessURI: accessURI,
            dataType: dataType,
            reward: 0,
            verified: false,
            claimed: false,
            submittedAt: block.timestamp,
            quality: 0
        });

        emit Submitted(submissionId, msg.sender, dataType);
    }

    function verify(uint256 submissionId, uint256 quality) external onlyRole(ORACLE_ROLE) {
        Submission storage submission = submissions[submissionId];
        if (submission.id == 0) revert InvalidSubmission();
        if (submission.verified) revert AlreadyVerified();
        if (quality > 100) revert InvalidQuality();

        submission.verified = true;
        submission.quality = quality;
        submission.reward = baseReward[submission.dataType] * quality / 100;

        score[submission.contributor] += quality;

        emit Verified(submissionId, quality, submission.reward);
    }

    function claim(uint256 submissionId) external {
        Submission storage submission = submissions[submissionId];
        if (
            submission.id == 0 ||
            submission.contributor != msg.sender ||
            !submission.verified ||
            submission.claimed
        ) {
            revert CannotClaim();
        }

        submission.claimed = true;
        rewardToken.transfer(msg.sender, submission.reward);

        emit Claimed(submissionId, msg.sender, submission.reward);
    }

    function tier(address account) external view returns (string memory) {
        uint256 totalScore = score[account];
        if (totalScore >= 1_000) return "platinum";
        if (totalScore >= 500) return "gold";
        if (totalScore >= 100) return "silver";
        return "bronze";
    }

    function setBaseReward(DataType dataType, uint256 reward) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseReward[dataType] = reward;
        emit BaseRewardUpdated(dataType, reward);
    }
}
