import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Created,
  Joined,
  Started,
  Contributed,
  Payout,
  CircleCompleted,
} from "../generated/SavingsCircle/SavingsCircle";
import { Circle } from "../generated/schema";

export function handleCircleCreated(event: Created): void {
  let c = new Circle(event.params.id.toString());
  c.creator = event.params.creator;
  c.name = event.params.name;
  c.contribution = BigInt.fromI32(0);
  c.cycleDuration = BigInt.fromI32(0);
  c.maxMembers = BigInt.fromI32(0);
  c.token = Bytes.empty();
  c.state = "Open";
  c.cycle = BigInt.fromI32(0);
  c.members = [];
  c.totalContributed = BigInt.fromI32(0);
  c.createdAt = event.block.timestamp;
  c.save();
}

export function handleMemberJoined(event: Joined): void {
  let c = Circle.load(event.params.id.toString());
  if (c) {
    let members = c.members;
    members.push(event.params.member);
    c.members = members;
    c.save();
  }
}

export function handleCircleStarted(event: Started): void {
  let c = Circle.load(event.params.id.toString());
  if (c) {
    c.state = "Active";
    c.cycle = BigInt.fromI32(1);
    c.save();
  }
}

export function handleContributed(event: Contributed): void {
  let c = Circle.load(event.params.id.toString());
  if (c) {
    c.totalContributed = c.totalContributed.plus(c.contribution);
    c.save();
  }
}

export function handlePayout(event: Payout): void {
  // Payout recorded; circle state handled by cycle increment
  let c = Circle.load(event.params.id.toString());
  if (c) {
    c.save();
  }
}

export function handleCircleCompleted(event: CircleCompleted): void {
  let c = Circle.load(event.params.id.toString());
  if (c) {
    c.state = "Completed";
    c.save();
  }
}
