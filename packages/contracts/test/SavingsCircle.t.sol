// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SavingsCircle.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("MockToken", "MTK") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SavingsCircleTest is Test {
    SavingsCircle public sc;
    MockToken public token;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xC4A411E);
    address public dave = address(0xDA7E);

    uint256 constant CONTRIBUTION = 100 ether;
    uint256 constant CYCLE_DURATION = 7 days;
    uint256 constant MAX_MEMBERS = 3;

    function setUp() public {
        token = new MockToken();
        sc = new SavingsCircle();

        // Distribute tokens
        token.transfer(alice, 10_000 ether);
        token.transfer(bob, 10_000 ether);
        token.transfer(charlie, 10_000 ether);
        token.transfer(dave, 10_000 ether);

        // Approve
        vm.prank(alice);
        token.approve(address(sc), type(uint256).max);
        vm.prank(bob);
        token.approve(address(sc), type(uint256).max);
        vm.prank(charlie);
        token.approve(address(sc), type(uint256).max);
        vm.prank(dave);
        token.approve(address(sc), type(uint256).max);
    }

    function _createAndFillCircle() internal returns (uint256 id) {
        vm.prank(alice);
        id = sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, MAX_MEMBERS, address(token));
        vm.prank(bob);
        sc.join(id);
        vm.prank(charlie);
        sc.join(id);
    }

    // --- create ---

    function test_create_success() public {
        vm.prank(alice);
        uint256 id = sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, MAX_MEMBERS, address(token));
        assertEq(id, 1);
        (
            uint256 cId,
            address creator,
            string memory name,
            uint256 contribution,
            uint256 cycleDuration,
            uint256 maxMembers,
            address cToken,
            SavingsCircle.State state,
            ,
        ) = sc.circles(1);
        assertEq(cId, 1);
        assertEq(creator, alice);
        assertEq(name, "TestCircle");
        assertEq(contribution, CONTRIBUTION);
        assertEq(cycleDuration, CYCLE_DURATION);
        assertEq(maxMembers, MAX_MEMBERS);
        assertEq(cToken, address(token));
        assertEq(uint8(state), uint8(SavingsCircle.State.Open));
    }

    function test_create_invalidMaxMembers_reverts() public {
        vm.prank(alice);
        vm.expectRevert("Invalid max members");
        sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, 1, address(token));

        vm.prank(alice);
        vm.expectRevert("Invalid max members");
        sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, 21, address(token));
    }

    function test_create_invalidCycleDuration_reverts() public {
        vm.prank(alice);
        vm.expectRevert("Cycle too short");
        sc.create("TestCircle", CONTRIBUTION, 1 hours, MAX_MEMBERS, address(token));
    }

    function test_create_creatorIsMember() public {
        vm.prank(alice);
        uint256 id = sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, MAX_MEMBERS, address(token));
        assertTrue(sc.isMember(id, alice));
    }

    // --- join ---

    function test_join_success() public {
        vm.prank(alice);
        uint256 id = sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, MAX_MEMBERS, address(token));
        vm.prank(bob);
        sc.join(id);
        assertTrue(sc.isMember(id, bob));
    }

    function test_join_alreadyMember_reverts() public {
        vm.prank(alice);
        uint256 id = sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, MAX_MEMBERS, address(token));
        vm.prank(bob);
        sc.join(id);
        vm.prank(bob);
        vm.expectRevert("Already member");
        sc.join(id);
    }

    function test_join_full_reverts() public {
        vm.prank(alice);
        uint256 id = sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, MAX_MEMBERS, address(token));
        vm.prank(bob);
        sc.join(id);
        vm.prank(charlie);
        sc.join(id);
        vm.prank(dave);
        vm.expectRevert("Full");
        sc.join(id);
    }

    function test_join_notOpen_reverts() public {
        uint256 id = _createAndFillCircle();
        vm.prank(alice);
        sc.start(id);
        vm.prank(dave);
        vm.expectRevert("Not open");
        sc.join(id);
    }

    // --- start ---

    function test_start_success() public {
        uint256 id = _createAndFillCircle();
        vm.prank(alice);
        sc.start(id);

        (, , , , , , , SavingsCircle.State state, uint256 cycle,) = sc.circles(id);
        assertEq(uint8(state), uint8(SavingsCircle.State.Active));
        assertEq(cycle, 1);
        assertEq(sc.order(id).length, 3);
    }

    function test_start_notCreator_reverts() public {
        uint256 id = _createAndFillCircle();
        vm.prank(bob);
        vm.expectRevert("Not creator");
        sc.start(id);
    }

    function test_start_notFull_reverts() public {
        vm.prank(alice);
        uint256 id = sc.create("TestCircle", CONTRIBUTION, CYCLE_DURATION, MAX_MEMBERS, address(token));
        vm.prank(bob);
        sc.join(id);
        // only 2 members, need 3
        vm.prank(alice);
        vm.expectRevert("Not full");
        sc.start(id);
    }

    // --- contribute ---

    function test_contribute_settlesWhenAllPay() public {
        uint256 id = _createAndFillCircle();
        vm.prank(alice);
        sc.start(id);

        address[] memory membersList = sc.members(id);
        address[] memory orderList = sc.order(id);
        address recipient = orderList[0];

        uint256 balBefore = token.balanceOf(recipient);

        // All members contribute
        for (uint256 i = 0; i < membersList.length; i++) {
            vm.prank(membersList[i]);
            sc.contribute(id);
        }

        // Pot should be paid out
        assertEq(token.balanceOf(recipient), balBefore + CONTRIBUTION * MAX_MEMBERS);
    }

    function test_contribute_notMember_reverts() public {
        uint256 id = _createAndFillCircle();
        vm.prank(alice);
        sc.start(id);

        vm.prank(dave);
        vm.expectRevert("Not member");
        sc.contribute(id);
    }

    function test_contribute_doublePay_reverts() public {
        uint256 id = _createAndFillCircle();
        vm.prank(alice);
        sc.start(id);

        vm.prank(alice);
        sc.contribute(id);

        vm.prank(alice);
        vm.expectRevert("Already paid");
        sc.contribute(id);
    }

    function test_contribute_fullCircleCompletes() public {
        uint256 id = _createAndFillCircle();
        vm.prank(alice);
        sc.start(id);

        address[] memory membersList = sc.members(id);

        // Complete all cycles
        for (uint256 cycle = 0; cycle < MAX_MEMBERS; cycle++) {
            for (uint256 i = 0; i < membersList.length; i++) {
                vm.prank(membersList[i]);
                sc.contribute(id);
            }
        }

        (, , , , , , , SavingsCircle.State state,,) = sc.circles(id);
        assertEq(uint8(state), uint8(SavingsCircle.State.Completed));
    }

    // --- members / order / isMember ---

    function test_members_returnsCorrect() public {
        uint256 id = _createAndFillCircle();
        address[] memory m = sc.members(id);
        assertEq(m.length, 3);
        assertEq(m[0], alice);
        assertEq(m[1], bob);
        assertEq(m[2], charlie);
    }

    function test_memberOf_tracked() public {
        vm.prank(alice);
        uint256 id1 = sc.create("C1", CONTRIBUTION, CYCLE_DURATION, 2, address(token));
        vm.prank(alice);
        sc.create("C2", CONTRIBUTION, CYCLE_DURATION, 2, address(token));

        uint256[] memory circles = sc.memberOf(alice);
        assertEq(circles.length, 2);
    }
}
