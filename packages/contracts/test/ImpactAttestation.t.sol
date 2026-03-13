// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ImpactAttestation.sol";

contract ImpactAttestationTest is Test {
    ImpactAttestation public ia;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public attester1 = address(0xA771);
    address public attester2 = address(0xA772);
    address public attester3 = address(0xA773);

    function setUp() public {
        ia = new ImpactAttestation();
        // admin is already attester, add more
        ia.addAttester(attester1);
        ia.addAttester(attester2);
        ia.addAttester(attester3);
        // Fund treasury
        deal(address(ia), 10 ether);
        (bool ok,) = address(ia).call{value: 10 ether}("");
        assertTrue(ok);
    }

    // --- submit ---

    function test_submit_success() public {
        vm.prank(alice);
        uint256 id = ia.submit("QmProof", "QmDesc", 1 ether);
        assertEq(id, 1);
        (
            uint256 aId,
            address contributor,
            string memory proofCID,
            string memory descCID,
            uint256 requestedReward,
            uint256 confirmations,
            uint256 rejections,
            bool rewarded,
            bool rejected,
            uint256 submittedAt
        ) = ia.attestations(1);
        assertEq(aId, 1);
        assertEq(contributor, alice);
        assertEq(proofCID, "QmProof");
        assertEq(descCID, "QmDesc");
        assertEq(requestedReward, 1 ether);
        assertEq(confirmations, 0);
        assertEq(rejections, 0);
        assertFalse(rewarded);
        assertFalse(rejected);
        assertGt(submittedAt, 0);
    }

    function test_submit_incrementsCount() public {
        vm.prank(alice);
        ia.submit("Qm1", "Qm1", 1 ether);
        vm.prank(bob);
        ia.submit("Qm2", "Qm2", 2 ether);
        assertEq(ia.count(), 2);
    }

    // --- confirm ---

    function test_confirm_success() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(attester1);
        ia.confirm(1);

        (, , , , , uint256 confirmations, , , ,) = ia.attestations(1);
        assertEq(confirmations, 1);
    }

    function test_confirm_emitsEvent() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.expectEmit(true, true, false, true);
        emit ImpactAttestation.Confirmed(1, attester1, 1);
        vm.prank(attester1);
        ia.confirm(1);
    }

    function test_confirm_doubleVote_reverts() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(attester1);
        ia.confirm(1);

        vm.prank(attester1);
        vm.expectRevert(ImpactAttestation.AlreadyVoted.selector);
        ia.confirm(1);
    }

    function test_confirm_afterWindow_reverts() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.warp(block.timestamp + 14 days + 1);
        vm.prank(attester1);
        vm.expectRevert(ImpactAttestation.WindowExpired.selector);
        ia.confirm(1);
    }

    function test_confirm_nonAttester_reverts() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(bob);
        vm.expectRevert();
        ia.confirm(1);
    }

    // --- reject ---

    function test_reject_success() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(attester1);
        ia.reject(1);

        (, , , , , , uint256 rejections, , ,) = ia.attestations(1);
        assertEq(rejections, 1);
    }

    function test_reject_doubleVote_reverts() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(attester1);
        ia.reject(1);

        vm.prank(attester1);
        vm.expectRevert(ImpactAttestation.AlreadyVoted.selector);
        ia.reject(1);
    }

    function test_reject_exceedsThreshold_setsRejected() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        address attester4 = address(0xA774);
        ia.addAttester(attester4);
        address attester5 = address(0xA775);
        ia.addAttester(attester5);

        vm.prank(attester1);
        ia.reject(1);
        vm.prank(attester2);
        ia.reject(1);
        vm.prank(attester3);
        ia.reject(1);
        vm.prank(attester4);
        ia.reject(1);

        (, , , , , , , , bool rejected,) = ia.attestations(1);
        assertTrue(rejected);
    }

    // --- claim ---

    function test_claim_success() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        // 3 confirmations
        vm.prank(attester1);
        ia.confirm(1);
        vm.prank(attester2);
        ia.confirm(1);
        vm.prank(attester3);
        ia.confirm(1);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        ia.claim(1);
        assertEq(alice.balance, balBefore + 1 ether);
        assertEq(ia.reputation(alice), 1 ether);
    }

    function test_claim_notContributor_reverts() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(attester1);
        ia.confirm(1);
        vm.prank(attester2);
        ia.confirm(1);
        vm.prank(attester3);
        ia.confirm(1);

        vm.prank(bob);
        vm.expectRevert("Forbidden");
        ia.claim(1);
    }

    function test_claim_insufficientConfirmations_reverts() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(attester1);
        ia.confirm(1);
        vm.prank(attester2);
        ia.confirm(1);
        // only 2 confirmations

        vm.prank(alice);
        vm.expectRevert(ImpactAttestation.NotEligible.selector);
        ia.claim(1);
    }

    function test_claim_doubleClaim_reverts() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(attester1);
        ia.confirm(1);
        vm.prank(attester2);
        ia.confirm(1);
        vm.prank(attester3);
        ia.confirm(1);

        vm.prank(alice);
        ia.claim(1);

        vm.prank(alice);
        vm.expectRevert(ImpactAttestation.AlreadyRewarded.selector);
        ia.claim(1);
    }

    function test_claim_rejected_reverts() public {
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        address attester4 = address(0xA774);
        ia.addAttester(attester4);
        address attester5 = address(0xA775);
        ia.addAttester(attester5);

        vm.prank(attester1);
        ia.reject(1);
        vm.prank(attester2);
        ia.reject(1);
        vm.prank(attester3);
        ia.reject(1);
        vm.prank(attester4);
        ia.reject(1);

        vm.prank(alice);
        vm.expectRevert(ImpactAttestation.NotEligible.selector);
        ia.claim(1);
    }

    // --- addAttester / removeAttester ---

    function test_addAttester_onlyAdmin() public {
        vm.prank(bob);
        vm.expectRevert();
        ia.addAttester(address(0x999));
    }

    function test_removeAttester_success() public {
        ia.removeAttester(attester1);
        // attester1 can no longer confirm
        vm.prank(alice);
        ia.submit("QmProof", "QmDesc", 1 ether);

        vm.prank(attester1);
        vm.expectRevert();
        ia.confirm(1);
    }

    // --- treasury ---

    function test_receive_increasesTreasury() public {
        uint256 before = ia.treasury();
        (bool ok,) = address(ia).call{value: 5 ether}("");
        assertTrue(ok);
        assertEq(ia.treasury(), before + 5 ether);
    }
}
