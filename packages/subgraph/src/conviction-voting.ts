import { BigInt } from "@graphprotocol/graph-ts";
import {
  ProposalCreated,
  ConvictionUpdated,
  ProposalExecuted,
  ProposalCancelled,
} from "../generated/ConvictionVoting/ConvictionVoting";
import { Proposal, Vote } from "../generated/schema";

export function handleProposalCreated(event: ProposalCreated): void {
  let p = new Proposal(event.params.id.toString());
  p.proposer = event.params.proposer;
  p.metadataCID = event.params.metadataCID;
  p.requestedAmount = event.params.requestedAmount;
  p.beneficiary = event.params.proposer; // beneficiary captured from contract state
  p.convictionLast = BigInt.fromI32(0);
  p.executed = false;
  p.cancelled = false;
  p.createdAt = event.block.timestamp;
  p.save();
}

export function handleConvictionUpdated(event: ConvictionUpdated): void {
  let id = event.params.proposalId.toString() + "-" + event.params.voter.toHex();
  let v = Vote.load(id);
  if (!v) {
    v = new Vote(id);
    v.amount = BigInt.fromI32(0);
  }
  v.proposal = event.params.proposalId.toString();
  v.voter = event.params.voter;
  v.conviction = event.params.conviction;
  v.blockNumber = event.block.number;
  v.timestamp = event.block.timestamp;
  v.save();

  let p = Proposal.load(event.params.proposalId.toString());
  if (p) {
    p.convictionLast = event.params.conviction;
    p.save();
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let p = Proposal.load(event.params.id.toString());
  if (p) {
    p.executed = true;
    p.save();
  }
}

export function handleProposalCancelled(event: ProposalCancelled): void {
  let p = Proposal.load(event.params.id.toString());
  if (p) {
    p.cancelled = true;
    p.save();
  }
}
