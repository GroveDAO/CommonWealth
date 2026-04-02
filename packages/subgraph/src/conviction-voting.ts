import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  ConvictionVoting,
  ProposalCreated,
  StakeChanged,
  ProposalExecuted,
  ProposalCancelled,
} from "../generated/ConvictionVoting/ConvictionVoting";
import { Proposal, Vote } from "../generated/schema";

const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");
const ZERO_BIG_INT = BigInt.zero();

function loadOrCreateProposal(id: BigInt): Proposal {
  let proposal = Proposal.load(id.toString());
  if (!proposal) {
    proposal = new Proposal(id.toString());
    proposal.proposer = ZERO_ADDRESS;
    proposal.metadataURI = "";
    proposal.requestedAmount = ZERO_BIG_INT;
    proposal.beneficiary = ZERO_ADDRESS;
    proposal.conviction = ZERO_BIG_INT;
    proposal.totalStaked = ZERO_BIG_INT;
    proposal.executed = false;
    proposal.cancelled = false;
    proposal.createdAt = ZERO_BIG_INT;
    proposal.updatedAt = ZERO_BIG_INT;
  }
  return proposal;
}

function syncProposalState(contract: ConvictionVoting, id: BigInt, timestamp: BigInt): Proposal {
  const proposal = loadOrCreateProposal(id);
  const proposalResult = contract.try_proposals(id);

  if (!proposalResult.reverted) {
    const value = proposalResult.value;
    proposal.proposer = value.value1;
    proposal.metadataURI = value.value2;
    proposal.requestedAmount = value.value3;
    proposal.beneficiary = value.value4;
    proposal.conviction = value.value5;
    proposal.totalStaked = value.value6;
    proposal.executed = value.value8;
    proposal.cancelled = value.value9;
    proposal.createdAt = value.value10;
  }

  if (proposal.createdAt.equals(ZERO_BIG_INT)) {
    proposal.createdAt = timestamp;
  }

  proposal.updatedAt = timestamp;
  proposal.save();
  return proposal;
}

export function handleProposalCreated(event: ProposalCreated): void {
  const contract = ConvictionVoting.bind(event.address);
  const proposal = syncProposalState(contract, event.params.id, event.block.timestamp);
  proposal.proposer = event.params.proposer;
  proposal.metadataURI = event.params.metadataURI;
  proposal.requestedAmount = event.params.requestedAmount;
  proposal.beneficiary = event.params.beneficiary;
  proposal.createdAt = event.block.timestamp;
  proposal.updatedAt = event.block.timestamp;
  proposal.save();
}

export function handleStakeChanged(event: StakeChanged): void {
  const contract = ConvictionVoting.bind(event.address);
  const proposal = syncProposalState(contract, event.params.proposalId, event.block.timestamp);
  const voteId = event.params.proposalId.toString() + "-" + event.params.voter.toHexString();
  let vote = Vote.load(voteId);

  if (!vote) {
    vote = new Vote(voteId);
    vote.amount = ZERO_BIG_INT;
    vote.previousStake = ZERO_BIG_INT;
  }

  vote.proposal = proposal.id;
  vote.voter = event.params.voter;
  vote.previousStake = event.params.previousStake;
  vote.amount = event.params.newStake;
  vote.conviction = event.params.currentConviction;
  vote.blockNumber = event.block.number;
  vote.timestamp = event.block.timestamp;
  vote.save();
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  const contract = ConvictionVoting.bind(event.address);
  const proposal = syncProposalState(contract, event.params.id, event.block.timestamp);
  proposal.executed = true;
  proposal.updatedAt = event.block.timestamp;
  proposal.save();
}

export function handleProposalCancelled(event: ProposalCancelled): void {
  const contract = ConvictionVoting.bind(event.address);
  const proposal = syncProposalState(contract, event.params.id, event.block.timestamp);
  proposal.cancelled = true;
  proposal.updatedAt = event.block.timestamp;
  proposal.save();
}
