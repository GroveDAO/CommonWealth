// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ConvictionVoting.sol";
import "../src/ImpactAttestation.sol";
import "../src/SavingsCircle.sol";
import "../src/DePINRegistry.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address governanceToken = vm.envAddress("GOVERNANCE_TOKEN");
        address rewardToken = vm.envAddress("REWARD_TOKEN");

        vm.startBroadcast(deployerPrivateKey);

        ConvictionVoting convictionVoting = new ConvictionVoting(governanceToken);
        console.log("ConvictionVoting deployed at:", address(convictionVoting));

        ImpactAttestation impactAttestation = new ImpactAttestation();
        console.log("ImpactAttestation deployed at:", address(impactAttestation));

        SavingsCircle savingsCircle = new SavingsCircle();
        console.log("SavingsCircle deployed at:", address(savingsCircle));

        DePINRegistry depinRegistry = new DePINRegistry(rewardToken);
        console.log("DePINRegistry deployed at:", address(depinRegistry));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("ConvictionVoting:  ", address(convictionVoting));
        console.log("ImpactAttestation: ", address(impactAttestation));
        console.log("SavingsCircle:     ", address(savingsCircle));
        console.log("DePINRegistry:     ", address(depinRegistry));
    }
}
