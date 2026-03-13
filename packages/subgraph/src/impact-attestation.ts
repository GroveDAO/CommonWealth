import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Submitted,
  Confirmed,
  Rewarded,
} from "../generated/ImpactAttestation/ImpactAttestation";
import { Attestation, Contributor } from "../generated/schema";

function getOrCreateContributor(address: Bytes): Contributor {
  let id = address.toHex();
  let contributor = Contributor.load(id);
  if (!contributor) {
    contributor = new Contributor(id);
    contributor.address = address;
    contributor.reputation = BigInt.fromI32(0);
    contributor.save();
  }
  return contributor;
}

export function handleAttestationSubmitted(event: Submitted): void {
  let contributor = getOrCreateContributor(event.params.contributor);

  let a = new Attestation(event.params.id.toString());
  a.contributor = contributor.id;
  a.proofCID = event.params.proofCID;
  a.descriptionCID = "";
  a.requestedReward = event.params.reward;
  a.confirmations = BigInt.fromI32(0);
  a.rewarded = false;
  a.submittedAt = event.block.timestamp;
  a.save();
}

export function handleConfirmed(event: Confirmed): void {
  let a = Attestation.load(event.params.id.toString());
  if (a) {
    a.confirmations = event.params.total;
    a.save();
  }
}

export function handleRewarded(event: Rewarded): void {
  let a = Attestation.load(event.params.id.toString());
  if (a) {
    a.rewarded = true;
    a.save();
  }

  let contributor = Contributor.load(event.params.contributor.toHex());
  if (contributor) {
    contributor.reputation = contributor.reputation.plus(event.params.amount);
    contributor.save();
  }
}
