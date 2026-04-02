import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  SavingsCircle,
  Created,
  Joined,
  Started,
  Contributed,
  Payout,
  CircleCompleted,
} from "../generated/SavingsCircle/SavingsCircle";
import { Circle } from "../generated/schema";

const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");
const ZERO_BIG_INT = BigInt.zero();

function stateToString(state: i32): string {
  if (state == 0) return "Open";
  if (state == 1) return "Active";
  return "Completed";
}

function addressesToBytes(addresses: Address[]): Bytes[] {
  const values = new Array<Bytes>(addresses.length);
  for (let index = 0; index < addresses.length; index++) {
    values[index] = addresses[index];
  }
  return values;
}

function loadOrCreateCircle(id: BigInt): Circle {
  let circle = Circle.load(id.toString());
  if (!circle) {
    circle = new Circle(id.toString());
    circle.creator = ZERO_ADDRESS;
    circle.name = "";
    circle.contribution = ZERO_BIG_INT;
    circle.cycleDuration = ZERO_BIG_INT;
    circle.maxMembers = ZERO_BIG_INT;
    circle.token = ZERO_ADDRESS;
    circle.state = "Open";
    circle.cycle = ZERO_BIG_INT;
    circle.cycleStart = ZERO_BIG_INT;
    circle.memberCount = ZERO_BIG_INT;
    circle.members = [];
    circle.payoutOrder = [];
    circle.currentRecipient = ZERO_ADDRESS;
    circle.totalContributed = ZERO_BIG_INT;
    circle.createdAt = ZERO_BIG_INT;
    circle.updatedAt = ZERO_BIG_INT;
  }
  return circle;
}

function syncCircleState(contract: SavingsCircle, id: BigInt, timestamp: BigInt): Circle {
  const circle = loadOrCreateCircle(id);
  const circleResult = contract.try_circles(id);

  if (!circleResult.reverted) {
    const value = circleResult.value;
    circle.creator = value.value1;
    circle.name = value.value2;
    circle.contribution = value.value3;
    circle.cycleDuration = value.value4;
    circle.maxMembers = value.value5;
    circle.token = value.value6;
    circle.state = stateToString(value.value7);
    circle.cycle = value.value8;
    circle.cycleStart = value.value9;
  }

  const memberCountResult = contract.try_memberCount(id);
  if (!memberCountResult.reverted) {
    circle.memberCount = memberCountResult.value;
  }

  const membersResult = contract.try_members(id);
  if (!membersResult.reverted) {
    circle.members = addressesToBytes(membersResult.value);
  }

  const orderResult = contract.try_order(id);
  if (!orderResult.reverted) {
    circle.payoutOrder = addressesToBytes(orderResult.value);
  }

  const recipientResult = contract.try_currentRecipient(id);
  if (!recipientResult.reverted) {
    circle.currentRecipient = recipientResult.value;
  }

  if (circle.createdAt.equals(ZERO_BIG_INT)) {
    circle.createdAt = timestamp;
  }

  circle.updatedAt = timestamp;
  circle.save();
  return circle;
}

export function handleCircleCreated(event: Created): void {
  const contract = SavingsCircle.bind(event.address);
  const circle = syncCircleState(contract, event.params.id, event.block.timestamp);
  circle.creator = event.params.creator;
  circle.name = event.params.name;
  circle.createdAt = event.block.timestamp;
  circle.updatedAt = event.block.timestamp;
  circle.save();
}

export function handleMemberJoined(event: Joined): void {
  const contract = SavingsCircle.bind(event.address);
  syncCircleState(contract, event.params.id, event.block.timestamp);
}

export function handleCircleStarted(event: Started): void {
  const contract = SavingsCircle.bind(event.address);
  syncCircleState(contract, event.params.id, event.block.timestamp);
}

export function handleContributed(event: Contributed): void {
  const contract = SavingsCircle.bind(event.address);
  const circle = syncCircleState(contract, event.params.id, event.block.timestamp);
  circle.totalContributed = circle.totalContributed.plus(circle.contribution);
  circle.updatedAt = event.block.timestamp;
  circle.save();
}

export function handlePayout(event: Payout): void {
  const contract = SavingsCircle.bind(event.address);
  syncCircleState(contract, event.params.id, event.block.timestamp);
}

export function handleCircleCompleted(event: CircleCompleted): void {
  const contract = SavingsCircle.bind(event.address);
  const circle = syncCircleState(contract, event.params.id, event.block.timestamp);
  circle.state = "Completed";
  circle.updatedAt = event.block.timestamp;
  circle.save();
}
