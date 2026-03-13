// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ConvictionVoting.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ConvictionVotingTest is Test {
    ConvictionVoting public cv;
    MockERC20 public token;

    address public owner = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xC4A411E);

    uint256 public constant TOTAL_SUPPLY = 1_000_000 ether;
    uint256 public constant THRESHOLD_AMOUNT = TOTAL_SUPPLY * 10 / 100;

    function setUp() public {
        token = new MockERC20("GovToken", "GOV");
        cv = new ConvictionVoting(address(token));

        // Fund alice and bob
        token.transfer(alice, 100_000 ether);
        token.transfer(bob, 100_000 ether);

        // Approve
        vm.prank(alice);
        token.approve(address(cv), type(uint256).max);

        vm.prank(bob);
        token.approve(address(cv), type(uint256).max);

        // Fund the contract with ETH
        deal(address(cv), 10 ether);
        vm.prank(owner);
        cv.deposit{value: 10 ether}();
    }

    // --- createProposal ---

    function test_createProposal_success() public {
        vm.prank(alice);
        uint256 id = cv.createProposal("QmCID1", 1 ether, payable(charlie));
        assertEq(id, 1);
        (
            uint256 pId,
            address proposer,
            string memory cid,
            uint256 amount,
            address payable beneficiary,
            ,
            ,
            bool executed,
            bool cancelled,
        ) = cv.proposals(1);
        assertEq(pId, 1);
        assertEq(proposer, alice);
        assertEq(cid, "QmCID1");
        assertEq(amount, 1 ether);
        assertEq(beneficiary, charlie);
        assertFalse(executed);
        assertFalse(cancelled);
    }

    function test_createProposal_incrementsCount() public {
        vm.prank(alice);
        cv.createProposal("Qm1", 1 ether, payable(charlie));
        vm.prank(bob);
        cv.createProposal("Qm2", 2 ether, payable(charlie));
        assertEq(cv.proposalCount(), 2);
    }

    function test_createProposal_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ConvictionVoting.ProposalCreated(1, alice, "QmCID1", 1 ether);
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
    }

    function test_createProposal_whenPaused_reverts() public {
        cv.pause();
        vm.prank(alice);
        vm.expectRevert();
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
    }

    // --- stakeOnProposal ---

    function test_stakeOnProposal_success() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));

        vm.prank(alice);
        cv.stakeOnProposal(1, 1000 ether);

        (uint256 amount,,) = cv.voterStates(1, alice);
        assertEq(amount, 1000 ether);
    }

    function test_stakeOnProposal_transfersTokens() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));

        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        cv.stakeOnProposal(1, 1000 ether);
        assertEq(token.balanceOf(alice), balBefore - 1000 ether);
        assertEq(token.balanceOf(address(cv)), 1000 ether);
    }

    function test_stakeOnProposal_cancelledProposal_reverts() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        vm.prank(alice);
        cv.cancelProposal(1);

        vm.prank(alice);
        vm.expectRevert(ConvictionVoting.Cancelled.selector);
        cv.stakeOnProposal(1, 1000 ether);
    }

    function test_stakeOnProposal_nonExistentProposal_reverts() public {
        vm.prank(alice);
        vm.expectRevert(ConvictionVoting.ProposalNotFound.selector);
        cv.stakeOnProposal(999, 1000 ether);
    }

    // --- withdrawStake ---

    function test_withdrawStake_success() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        vm.prank(alice);
        cv.stakeOnProposal(1, 1000 ether);

        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        cv.withdrawStake(1, 500 ether);
        assertEq(token.balanceOf(alice), balBefore + 500 ether);

        (uint256 amount,,) = cv.voterStates(1, alice);
        assertEq(amount, 500 ether);
    }

    function test_withdrawStake_insufficientStake_reverts() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        vm.prank(alice);
        cv.stakeOnProposal(1, 100 ether);

        vm.prank(alice);
        vm.expectRevert("Insufficient stake");
        cv.withdrawStake(1, 200 ether);
    }

    // --- executeProposal ---

    function test_executeProposal_success() public {
        // Get enough tokens to meet threshold
        token.mint(alice, TOTAL_SUPPLY); // Alice has enough to meet threshold
        vm.prank(alice);
        token.approve(address(cv), type(uint256).max);

        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));

        // Stake enough to meet conviction threshold
        vm.prank(alice);
        cv.stakeOnProposal(1, TOTAL_SUPPLY / 10 + 1 ether);

        // Roll blocks to build conviction
        vm.roll(block.number + 1000);

        // Warp past min voting period
        vm.warp(block.timestamp + 3 days + 1);

        uint256 charlieBalBefore = charlie.balance;
        cv.executeProposal(1);
        assertEq(charlie.balance, charlieBalBefore + 1 ether);

        (, , , , , , , bool executed,,) = cv.proposals(1);
        assertTrue(executed);
    }

    function test_executeProposal_beforeMinPeriod_reverts() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));

        vm.expectRevert(ConvictionVoting.VotingPeriodNotElapsed.selector);
        cv.executeProposal(1);
    }

    function test_executeProposal_insufficientConviction_reverts() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));

        vm.warp(block.timestamp + 3 days + 1);
        vm.expectRevert(ConvictionVoting.InsufficientConviction.selector);
        cv.executeProposal(1);
    }

    function test_executeProposal_alreadyExecuted_reverts() public {
        token.mint(alice, TOTAL_SUPPLY * 2);
        vm.prank(alice);
        token.approve(address(cv), type(uint256).max);

        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        vm.prank(alice);
        cv.stakeOnProposal(1, TOTAL_SUPPLY / 10 + 1 ether);
        vm.roll(block.number + 1000);
        vm.warp(block.timestamp + 3 days + 1);
        cv.executeProposal(1);

        vm.expectRevert(ConvictionVoting.AlreadyExecuted.selector);
        cv.executeProposal(1);
    }

    // --- cancelProposal ---

    function test_cancelProposal_byProposer() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        vm.prank(alice);
        cv.cancelProposal(1);

        (, , , , , , , , bool cancelled,) = cv.proposals(1);
        assertTrue(cancelled);
    }

    function test_cancelProposal_byOwner() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        cv.cancelProposal(1); // owner calls

        (, , , , , , , , bool cancelled,) = cv.proposals(1);
        assertTrue(cancelled);
    }

    function test_cancelProposal_byUnauthorized_reverts() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        vm.prank(bob);
        vm.expectRevert("Forbidden");
        cv.cancelProposal(1);
    }

    // --- getCurrentConviction ---

    function test_getCurrentConviction_noStake_returnsZero() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        assertEq(cv.getCurrentConviction(1, alice), 0);
    }

    function test_getCurrentConviction_growsOverBlocks() public {
        vm.prank(alice);
        cv.createProposal("QmCID1", 1 ether, payable(charlie));
        vm.prank(alice);
        cv.stakeOnProposal(1, 1000 ether);

        uint256 c0 = cv.getCurrentConviction(1, alice);
        vm.roll(block.number + 10);
        uint256 c10 = cv.getCurrentConviction(1, alice);
        assertGt(c10, c0);
    }

    // --- pause/unpause ---

    function test_pause_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        cv.pause();
    }

    function test_unpause_onlyOwner() public {
        cv.pause();
        vm.prank(alice);
        vm.expectRevert();
        cv.unpause();
    }

    // --- deposit ---

    function test_deposit_increasesFundBalance() public {
        uint256 before = cv.fundBalance();
        cv.deposit{value: 5 ether}();
        assertEq(cv.fundBalance(), before + 5 ether);
    }

    function test_receive_increasesFundBalance() public {
        uint256 before = cv.fundBalance();
        (bool ok,) = address(cv).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(cv.fundBalance(), before + 1 ether);
    }
}
