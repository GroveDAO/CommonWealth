import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  DePINRegistry,
  Submitted,
  Verified,
  Claimed,
} from "../generated/DePINRegistry/DePINRegistry";
import { DataSubmission } from "../generated/schema";

const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");
const ZERO_BIG_INT = BigInt.zero();

function dataTypeToString(dtype: i32): string {
  if (dtype === 0) return "Environmental";
  if (dtype === 1) return "Infrastructure";
  if (dtype === 2) return "Compute";
  if (dtype === 3) return "Storage";
  if (dtype === 4) return "Bandwidth";
  return "Unknown";
}

function loadOrCreateSubmission(id: BigInt): DataSubmission {
  let submission = DataSubmission.load(id.toString());
  if (!submission) {
    submission = new DataSubmission(id.toString());
    submission.contributor = ZERO_ADDRESS;
    submission.metadataURI = "";
    submission.accessURI = "";
    submission.dataType = "Unknown";
    submission.quality = ZERO_BIG_INT;
    submission.reward = ZERO_BIG_INT;
    submission.verified = false;
    submission.claimed = false;
    submission.submittedAt = ZERO_BIG_INT;
    submission.updatedAt = ZERO_BIG_INT;
  }
  return submission;
}

function syncSubmissionState(contract: DePINRegistry, id: BigInt, timestamp: BigInt): DataSubmission {
  const submission = loadOrCreateSubmission(id);
  const submissionResult = contract.try_submissions(id);

  if (!submissionResult.reverted) {
    const value = submissionResult.value;
    submission.contributor = value.value1;
    submission.metadataURI = value.value2;
    submission.accessURI = value.value3;
    submission.dataType = dataTypeToString(value.value4);
    submission.reward = value.value5;
    submission.verified = value.value6;
    submission.claimed = value.value7;
    submission.submittedAt = value.value8;
    submission.quality = value.value9;
  }

  if (submission.submittedAt.equals(ZERO_BIG_INT)) {
    submission.submittedAt = timestamp;
  }

  submission.updatedAt = timestamp;
  submission.save();
  return submission;
}

export function handleDataSubmitted(event: Submitted): void {
  const contract = DePINRegistry.bind(event.address);
  const submission = syncSubmissionState(contract, event.params.id, event.block.timestamp);
  submission.contributor = event.params.contributor;
  submission.dataType = dataTypeToString(event.params.dataType);
  submission.submittedAt = event.block.timestamp;
  submission.updatedAt = event.block.timestamp;
  submission.save();
}

export function handleDataVerified(event: Verified): void {
  const contract = DePINRegistry.bind(event.address);
  const submission = syncSubmissionState(contract, event.params.id, event.block.timestamp);
  submission.quality = event.params.quality;
  submission.reward = event.params.reward;
  submission.verified = true;
  submission.updatedAt = event.block.timestamp;
  submission.save();
}

export function handleDataClaimed(event: Claimed): void {
  const contract = DePINRegistry.bind(event.address);
  const submission = syncSubmissionState(contract, event.params.id, event.block.timestamp);
  submission.claimed = true;
  submission.updatedAt = event.block.timestamp;
  submission.save();
}
