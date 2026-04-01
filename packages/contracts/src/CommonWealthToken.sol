// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title CommonWealthToken
/// @notice Governance and utility token for the CommonWealth Sepolia deployment.
contract CommonWealthToken is ERC20, Ownable {
    uint256 public faucetAmount;
    uint256 public faucetCooldown;

    mapping(address => uint256) public lastClaimAt;

    event FaucetClaimed(address indexed account, uint256 amount, uint256 claimedAt);
    event FaucetUpdated(uint256 amount, uint256 cooldown);

    error ClaimTooSoon(uint256 nextClaimAt);
    error InvalidConfig();

    constructor(
        address initialOwner,
        uint256 initialSupply,
        uint256 faucetAmount_,
        uint256 faucetCooldown_
    ) ERC20("CommonWealth Token", "CWT") Ownable(initialOwner) {
        if (initialOwner == address(0) || faucetAmount_ == 0 || faucetCooldown_ == 0) {
            revert InvalidConfig();
        }

        faucetAmount = faucetAmount_;
        faucetCooldown = faucetCooldown_;

        _mint(initialOwner, initialSupply);
    }

    function claimFaucet() external returns (uint256 amount) {
        uint256 nextClaimAt = lastClaimAt[msg.sender] + faucetCooldown;
        if (block.timestamp < nextClaimAt) revert ClaimTooSoon(nextClaimAt);

        amount = faucetAmount;
        lastClaimAt[msg.sender] = block.timestamp;
        _mint(msg.sender, amount);

        emit FaucetClaimed(msg.sender, amount, block.timestamp);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function setFaucetConfig(uint256 faucetAmount_, uint256 faucetCooldown_) external onlyOwner {
        if (faucetAmount_ == 0 || faucetCooldown_ == 0) revert InvalidConfig();

        faucetAmount = faucetAmount_;
        faucetCooldown = faucetCooldown_;

        emit FaucetUpdated(faucetAmount_, faucetCooldown_);
    }
}
