import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  ImpactAttestation,
  Submitted,
  Confirmed,
  Rejected,
  Rewarded,
} from "../generated/ImpactAttestation/ImpactAttestation";
import { Attestation, Contributor } from "../generated/schema";

const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");
const ZERO_BIG_INT = BigInt.zero();

function getOrCreateContributor(contract: ImpactAttestation, account: Address): Contributor {
  const id = account.toHexString();
  let contributor = Contributor.load(id);

  if (!contributor) {
    contributor = new Contributor(id);
    contributor.address = account;
    contributor.reputation = ZERO_BIG_INT;
  }

  const reputationResult = contract.try_reputation(account);
  if (!reputationResult.reverted) {
    contributor.reputation = reputationResult.value;
  }

  contributor.save();
  return contributor;
}

function loadOrCreateAttestation(id: BigInt): Attestation {
  let attestation = Attestation.load(id.toString());
  if (!attestation) {
    attestation = new Attestation(id.toString());
    attestation.contributor = ZERO_ADDRESS.toHexString();
    attestation.proofURI = "";
    attestation.descriptionURI = "";
    attestation.requestedReward = ZERO_BIG_INT;
    attestation.confirmations = ZERO_BIG_INT;
    attestation.rejections = ZERO_BIG_INT;
    attestation.rewarded = false;
    attestation.rejected = false;
    attestation.submittedAt = ZERO_BIG_INT;
    attestation.updatedAt = ZERO_BIG_INT;
  }
  return attestation;
}

function syncAttestationState(contract: ImpactAttestation, id: BigInt, timestamp: BigInt): Attestation {
  const attestation = loadOrCreateAttestation(id);
  const attestationResult = contract.try_attestations(id);

  if (!attestationResult.reverted) {
    const value = attestationResult.value;
    const contributor = getOrCreateContributor(contract, value.value1);
    attestation.contributor = contributor.id;
    attestation.proofURI = value.value2;
    attestation.descriptionURI = value.value3;
    attestation.requestedReward = value.value4;
    attestation.confirmations = value.value5;
    attestation.rejections = value.value6;
    attestation.rewarded = value.value7;
    attestation.rejected = value.value8;
    attestation.submittedAt = value.value9;
  }

  if (attestation.submittedAt.equals(ZERO_BIG_INT)) {
    attestation.submittedAt = timestamp;
  }

  attestation.updatedAt = timestamp;
  attestation.save();
  return attestation;
}

export function handleAttestationSubmitted(event: Submitted): void {
  const contract = ImpactAttestation.bind(event.address);
  const contributor = getOrCreateContributor(contract, event.params.contributor);
  const attestation = syncAttestationState(contract, event.params.id, event.block.timestamp);
  attestation.contributor = contributor.id;
  attestation.proofURI = event.params.proofURI;
  attestation.requestedReward = event.params.reward;
  attestation.submittedAt = event.block.timestamp;
  attestation.updatedAt = event.block.timestamp;
  attestation.save();
}

export function handleConfirmed(event: Confirmed): void {
  const contract = ImpactAttestation.bind(event.address);
  const attestation = syncAttestationState(contract, event.params.id, event.block.timestamp);
  attestation.confirmations = event.params.total;
  attestation.updatedAt = event.block.timestamp;
  attestation.save();
}

export function handleRejected(event: Rejected): void {
  const contract = ImpactAttestation.bind(event.address);
  const attestation = syncAttestationState(contract, event.params.id, event.block.timestamp);
  attestation.rejections = event.params.total;
  attestation.updatedAt = event.block.timestamp;
  attestation.save();
}

export function handleRewarded(event: Rewarded): void {
  const contract = ImpactAttestation.bind(event.address);
  const attestation = syncAttestationState(contract, event.params.id, event.block.timestamp);
  attestation.rewarded = true;
  attestation.updatedAt = event.block.timestamp;
  attestation.save();

  getOrCreateContributor(contract, event.params.contributor);
}
