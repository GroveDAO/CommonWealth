import { BigInt } from "@graphprotocol/graph-ts";
import {
  Submitted,
  Verified,
  Claimed,
} from "../generated/DePINRegistry/DePINRegistry";
import { DataSubmission } from "../generated/schema";

function dataTypeToString(dtype: i32): string {
  if (dtype === 0) return "Environmental";
  if (dtype === 1) return "Infrastructure";
  if (dtype === 2) return "Compute";
  if (dtype === 3) return "Storage";
  if (dtype === 4) return "Bandwidth";
  return "Unknown";
}

export function handleDataSubmitted(event: Submitted): void {
  let s = new DataSubmission(event.params.id.toString());
  s.contributor = event.params.contributor;
  s.dataCID = "";
  s.litCID = "";
  s.dtype = dataTypeToString(event.params.dtype);
  s.quality = BigInt.fromI32(0);
  s.reward = BigInt.fromI32(0);
  s.verified = false;
  s.claimed = false;
  s.submittedAt = event.block.timestamp;
  s.save();
}

export function handleDataVerified(event: Verified): void {
  let s = DataSubmission.load(event.params.id.toString());
  if (s) {
    s.quality = event.params.quality;
    s.reward = event.params.reward;
    s.verified = true;
    s.save();
  }
}

export function handleDataClaimed(event: Claimed): void {
  let s = DataSubmission.load(event.params.id.toString());
  if (s) {
    s.claimed = true;
    s.save();
  }
}
