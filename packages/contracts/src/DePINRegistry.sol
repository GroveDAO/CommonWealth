// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DePINRegistry
/// @notice Oracle-verified data contributions with Filecoin CID + Lit Protocol access CID
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
        string dataCID;
        string litCID;
        DataType dtype;
        uint256 reward;
        bool verified;
        bool claimed;
        uint256 submittedAt;
        uint256 quality;
    }

    uint256 public count;
    mapping(uint256 => Submission) public subs;
    mapping(address => uint256) public score;
    mapping(DataType => uint256) public baseReward;
    IERC20 public token;

    event Submitted(uint256 indexed id, address indexed contributor, DataType dtype);
    event Verified(uint256 indexed id, uint256 quality, uint256 reward);
    event Claimed(uint256 indexed id, address contributor, uint256 reward);

    error AlreadyVerified();
    error InvalidQuality();
    error CannotClaim();

    constructor(address _token) {
        token = IERC20(_token);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        baseReward[DataType.Environmental] = 10 ether;
        baseReward[DataType.Infrastructure] = 15 ether;
        baseReward[DataType.Compute] = 20 ether;
        baseReward[DataType.Storage] = 8 ether;
        baseReward[DataType.Bandwidth] = 5 ether;
    }

    /// @notice Submit a new data contribution
    function submit(string calldata _cid, string calldata _litCID, DataType _type) external returns (uint256) {
        uint256 id = ++count;
        subs[id] = Submission({
            id: id,
            contributor: msg.sender,
            dataCID: _cid,
            litCID: _litCID,
            dtype: _type,
            reward: 0,
            verified: false,
            claimed: false,
            submittedAt: block.timestamp,
            quality: 0
        });
        emit Submitted(id, msg.sender, _type);
        return id;
    }

    /// @notice Oracle verifies a submission and sets quality score
    function verify(uint256 _id, uint256 _quality) external onlyRole(ORACLE_ROLE) {
        Submission storage s = subs[_id];
        if (s.verified) revert AlreadyVerified();
        if (_quality > 100) revert InvalidQuality();
        s.verified = true;
        s.quality = _quality;
        s.reward = baseReward[s.dtype] * _quality / 100;
        score[s.contributor] += _quality;
        emit Verified(_id, _quality, s.reward);
    }

    /// @notice Claim reward for a verified submission
    function claim(uint256 _id) external {
        Submission storage s = subs[_id];
        if (s.contributor != msg.sender || !s.verified || s.claimed) revert CannotClaim();
        s.claimed = true;
        token.transfer(msg.sender, s.reward);
        emit Claimed(_id, msg.sender, s.reward);
    }

    /// @notice Get contributor tier based on cumulative score
    function tier(address _a) external view returns (string memory) {
        uint256 s = score[_a];
        if (s >= 1000) return "platinum";
        if (s >= 500) return "gold";
        if (s >= 100) return "silver";
        return "bronze";
    }

    /// @notice Set base reward for a data type (admin only)
    function setBaseReward(DataType _t, uint256 _r) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseReward[_t] = _r;
    }
}
