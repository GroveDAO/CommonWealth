// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DePINRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RewardToken is ERC20 {
    constructor() ERC20("RewardToken", "RWD") {
        _mint(msg.sender, 10_000_000 ether);
    }
}

contract DePINRegistryTest is Test {
    DePINRegistry public registry;
    RewardToken public token;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public oracle = address(0x0RAC1E);

    function setUp() public {
        token = new RewardToken();
        registry = new DePINRegistry(address(token));

        // Transfer tokens to registry for rewards
        token.transfer(address(registry), 1_000_000 ether);

        // Add oracle
        registry.grantRole(registry.ORACLE_ROLE(), oracle);
    }

    // --- submit ---

    function test_submit_success() public {
        vm.prank(alice);
        uint256 id = registry.submit("QmData", "QmLit", DePINRegistry.DataType.Environmental);
        assertEq(id, 1);

        (
            uint256 sId,
            address contributor,
            string memory dataCID,
            string memory litCID,
            DePINRegistry.DataType dtype,
            uint256 reward,
            bool verified,
            bool claimed,
            ,
            uint256 quality
        ) = registry.subs(1);
        assertEq(sId, 1);
        assertEq(contributor, alice);
        assertEq(dataCID, "QmData");
        assertEq(litCID, "QmLit");
        assertEq(uint8(dtype), uint8(DePINRegistry.DataType.Environmental));
        assertEq(reward, 0);
        assertFalse(verified);
        assertFalse(claimed);
        assertEq(quality, 0);
    }

    function test_submit_incrementsCount() public {
        vm.prank(alice);
        registry.submit("Qm1", "Qm1", DePINRegistry.DataType.Compute);
        vm.prank(bob);
        registry.submit("Qm2", "Qm2", DePINRegistry.DataType.Storage);
        assertEq(registry.count(), 2);
    }

    function test_submit_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit DePINRegistry.Submitted(1, alice, DePINRegistry.DataType.Environmental);
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Environmental);
    }

    // --- verify ---

    function test_verify_success() public {
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Environmental);

        vm.prank(oracle);
        registry.verify(1, 80);

        (, , , , , uint256 reward, bool verified, , , uint256 quality) = registry.subs(1);
        assertTrue(verified);
        assertEq(quality, 80);
        // baseReward[Environmental] = 10 ether, quality 80 -> 8 ether
        assertEq(reward, 8 ether);
        assertEq(registry.score(alice), 80);
    }

    function test_verify_allDataTypes() public {
        // Environmental: 10 ether * 100 / 100 = 10 ether
        vm.prank(alice);
        registry.submit("Qm1", "Qm1", DePINRegistry.DataType.Environmental);
        vm.prank(oracle);
        registry.verify(1, 100);
        (, , , , , uint256 r1, , , ,) = registry.subs(1);
        assertEq(r1, 10 ether);

        // Infrastructure: 15 ether
        vm.prank(alice);
        registry.submit("Qm2", "Qm2", DePINRegistry.DataType.Infrastructure);
        vm.prank(oracle);
        registry.verify(2, 100);
        (, , , , , uint256 r2, , , ,) = registry.subs(2);
        assertEq(r2, 15 ether);

        // Compute: 20 ether
        vm.prank(alice);
        registry.submit("Qm3", "Qm3", DePINRegistry.DataType.Compute);
        vm.prank(oracle);
        registry.verify(3, 100);
        (, , , , , uint256 r3, , , ,) = registry.subs(3);
        assertEq(r3, 20 ether);

        // Storage: 8 ether
        vm.prank(alice);
        registry.submit("Qm4", "Qm4", DePINRegistry.DataType.Storage);
        vm.prank(oracle);
        registry.verify(4, 100);
        (, , , , , uint256 r4, , , ,) = registry.subs(4);
        assertEq(r4, 8 ether);

        // Bandwidth: 5 ether
        vm.prank(alice);
        registry.submit("Qm5", "Qm5", DePINRegistry.DataType.Bandwidth);
        vm.prank(oracle);
        registry.verify(5, 100);
        (, , , , , uint256 r5, , , ,) = registry.subs(5);
        assertEq(r5, 5 ether);
    }

    function test_verify_doubleVerify_reverts() public {
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Environmental);

        vm.prank(oracle);
        registry.verify(1, 80);

        vm.prank(oracle);
        vm.expectRevert(DePINRegistry.AlreadyVerified.selector);
        registry.verify(1, 90);
    }

    function test_verify_invalidQuality_reverts() public {
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Environmental);

        vm.prank(oracle);
        vm.expectRevert(DePINRegistry.InvalidQuality.selector);
        registry.verify(1, 101);
    }

    function test_verify_nonOracle_reverts() public {
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Environmental);

        vm.prank(bob);
        vm.expectRevert();
        registry.verify(1, 80);
    }

    // --- claim ---

    function test_claim_success() public {
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Compute);
        vm.prank(oracle);
        registry.verify(1, 100); // 20 ether

        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        registry.claim(1);
        assertEq(token.balanceOf(alice), balBefore + 20 ether);

        (, , , , , , , bool claimed, ,) = registry.subs(1);
        assertTrue(claimed);
    }

    function test_claim_notContributor_reverts() public {
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Environmental);
        vm.prank(oracle);
        registry.verify(1, 100);

        vm.prank(bob);
        vm.expectRevert(DePINRegistry.CannotClaim.selector);
        registry.claim(1);
    }

    function test_claim_notVerified_reverts() public {
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Environmental);

        vm.prank(alice);
        vm.expectRevert(DePINRegistry.CannotClaim.selector);
        registry.claim(1);
    }

    function test_claim_doubleClaim_reverts() public {
        vm.prank(alice);
        registry.submit("QmData", "QmLit", DePINRegistry.DataType.Compute);
        vm.prank(oracle);
        registry.verify(1, 100);

        vm.prank(alice);
        registry.claim(1);

        vm.prank(alice);
        vm.expectRevert(DePINRegistry.CannotClaim.selector);
        registry.claim(1);
    }

    // --- tier ---

    function test_tier_bronze() public {
        assertEq(registry.tier(alice), "bronze");
    }

    function test_tier_silver() public {
        // Need 100 score
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(alice);
            registry.submit(string(abi.encodePacked("Qm", i)), "QmLit", DePINRegistry.DataType.Compute);
            vm.prank(oracle);
            registry.verify(i + 1, 50);
        }
        assertEq(registry.tier(alice), "silver");
    }

    function test_tier_gold() public {
        // Need 500 score
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(alice);
            registry.submit(string(abi.encodePacked("Qm", i)), "QmLit", DePINRegistry.DataType.Compute);
            vm.prank(oracle);
            registry.verify(i + 1, 100);
        }
        assertEq(registry.tier(alice), "gold");
    }

    function test_tier_platinum() public {
        // Need 1000 score
        for (uint256 i = 0; i < 10; i++) {
            vm.prank(alice);
            registry.submit(string(abi.encodePacked("Qm", i)), "QmLit", DePINRegistry.DataType.Compute);
            vm.prank(oracle);
            registry.verify(i + 1, 100);
        }
        assertEq(registry.tier(alice), "platinum");
    }

    // --- setBaseReward ---

    function test_setBaseReward_success() public {
        registry.setBaseReward(DePINRegistry.DataType.Environmental, 50 ether);
        assertEq(registry.baseReward(DePINRegistry.DataType.Environmental), 50 ether);
    }

    function test_setBaseReward_nonAdmin_reverts() public {
        vm.prank(bob);
        vm.expectRevert();
        registry.setBaseReward(DePINRegistry.DataType.Environmental, 50 ether);
    }
}
