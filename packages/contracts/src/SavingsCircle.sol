// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SavingsCircle
/// @notice Digital ROSCA (Rotating Savings and Credit Association) on-chain
contract SavingsCircle is ReentrancyGuard {
    enum State {
        Open,
        Active,
        Completed
    }

    struct Circle {
        uint256 id;
        address creator;
        string name;
        uint256 contribution;
        uint256 cycleDuration;
        uint256 maxMembers;
        address token;
        State state;
        uint256 cycle;
        uint256 cycleStart;
        address[] members;
        address[] order;
        mapping(address => bool) isMember;
        mapping(uint256 => mapping(address => bool)) paid;
    }

    uint256 public count;
    mapping(uint256 => Circle) public circles;
    mapping(address => uint256[]) public memberOf;

    event Created(uint256 indexed id, address creator, string name);
    event Joined(uint256 indexed id, address member);
    event Started(uint256 indexed id);
    event Contributed(uint256 indexed id, address member, uint256 cycle);
    event Payout(uint256 indexed id, address recipient, uint256 amount, uint256 cycle);
    event CircleCompleted(uint256 indexed id);

    /// @notice Create a new savings circle
    function create(
        string calldata _name,
        uint256 _contrib,
        uint256 _dur,
        uint256 _max,
        address _token
    ) external returns (uint256) {
        require(_max >= 2 && _max <= 20, "Invalid max members");
        require(_dur >= 1 days, "Cycle too short");
        uint256 id = ++count;
        Circle storage c = circles[id];
        c.id = id;
        c.creator = msg.sender;
        c.name = _name;
        c.contribution = _contrib;
        c.cycleDuration = _dur;
        c.maxMembers = _max;
        c.token = _token;
        c.state = State.Open;
        _join(id, msg.sender);
        emit Created(id, msg.sender, _name);
        return id;
    }

    /// @notice Join an open circle
    function join(uint256 _id) external {
        Circle storage c = circles[_id];
        require(c.state == State.Open, "Not open");
        require(!c.isMember[msg.sender], "Already member");
        require(c.members.length < c.maxMembers, "Full");
        _join(_id, msg.sender);
    }

    /// @notice Start the circle (creator only, must be full)
    function start(uint256 _id) external {
        Circle storage c = circles[_id];
        require(c.creator == msg.sender, "Not creator");
        require(c.state == State.Open, "Not open");
        require(c.members.length == c.maxMembers, "Not full");
        c.state = State.Active;
        c.cycleStart = block.timestamp;
        c.cycle = 1;
        // Copy members to order array
        for (uint256 i = 0; i < c.members.length; i++) {
            c.order.push(c.members[i]);
        }
        _shuffle(c.order, block.prevrandao);
        emit Started(_id);
    }

    /// @notice Contribute for current cycle
    function contribute(uint256 _id) external nonReentrant {
        Circle storage c = circles[_id];
        require(c.state == State.Active, "Not active");
        require(c.isMember[msg.sender], "Not member");
        require(!c.paid[c.cycle][msg.sender], "Already paid");
        IERC20(c.token).transferFrom(msg.sender, address(this), c.contribution);
        c.paid[c.cycle][msg.sender] = true;
        emit Contributed(_id, msg.sender, c.cycle);
        if (_allPaid(_id)) _settle(_id);
    }

    function _settle(uint256 _id) internal {
        Circle storage c = circles[_id];
        uint256 pot = c.contribution * c.members.length;
        address r = c.order[c.cycle - 1];
        IERC20(c.token).transfer(r, pot);
        emit Payout(_id, r, pot, c.cycle);
        if (c.cycle == c.members.length) {
            c.state = State.Completed;
            emit CircleCompleted(_id);
        } else {
            c.cycle++;
            c.cycleStart = block.timestamp;
        }
    }

    function _join(uint256 _id, address _m) internal {
        Circle storage c = circles[_id];
        c.isMember[_m] = true;
        c.members.push(_m);
        memberOf[_m].push(_id);
        emit Joined(_id, _m);
    }

    function _allPaid(uint256 _id) internal view returns (bool) {
        Circle storage c = circles[_id];
        for (uint256 i = 0; i < c.members.length; i++) {
            if (!c.paid[c.cycle][c.members[i]]) return false;
        }
        return true;
    }

    function _shuffle(address[] storage a, uint256 seed) internal {
        for (uint256 i = a.length - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encode(seed, i))) % (i + 1);
            (a[i], a[j]) = (a[j], a[i]);
        }
    }

    function members(uint256 _id) external view returns (address[] memory) {
        return circles[_id].members;
    }

    function order(uint256 _id) external view returns (address[] memory) {
        return circles[_id].order;
    }

    function isMember(uint256 _id, address _addr) external view returns (bool) {
        return circles[_id].isMember[_addr];
    }

    function hasPaid(uint256 _id, uint256 _cycle, address _addr) external view returns (bool) {
        return circles[_id].paid[_cycle][_addr];
    }
}
