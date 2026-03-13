"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { CONVICTION_VOTING_ABI } from "@commonwealth/sdk";
import { CreateProposalModal } from "./CreateProposalModal";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONVICTION_VOTING_ADDRESS ?? "0x0") as `0x${string}`;

interface MockProposal {
  id: number;
  title: string;
  proposer: string;
  requestedAmount: number;
  conviction: number;
  threshold: number;
  daysLeft: number;
  staked: number;
}

const MOCK_PROPOSALS: MockProposal[] = [
  {
    id: 1,
    title: "Fund Filecoin storage infrastructure expansion",
    proposer: "0xabc123...def456",
    requestedAmount: 15,
    conviction: 78,
    threshold: 100,
    daysLeft: 5,
    staked: 12400,
  },
  {
    id: 2,
    title: "NEAR Protocol bridge integration for chain abstraction",
    proposer: "0x789abc...123def",
    requestedAmount: 8,
    conviction: 52,
    threshold: 100,
    daysLeft: 12,
    staked: 8750,
  },
  {
    id: 3,
    title: "Starknet ZK voting module deployment",
    proposer: "0x456789...abcdef",
    requestedAmount: 22,
    conviction: 91,
    threshold: 100,
    daysLeft: 1,
    staked: 31200,
  },
  {
    id: 4,
    title: "Lit Protocol DePIN access gating upgrade",
    proposer: "0xfed321...654abc",
    requestedAmount: 5,
    conviction: 34,
    threshold: 100,
    daysLeft: 19,
    staked: 4100,
  },
];

function convictionColor(pct: number): string {
  if (pct >= 90) return "bg-accent-green";
  if (pct >= 50) return "bg-accent-yellow";
  return "bg-accent-purple";
}

function ConvictionBar({ conviction, threshold }: { conviction: number; threshold: number }) {
  const pct = Math.min(Math.round((conviction / threshold) * 100), 100);
  return (
    <div className="w-full h-1.5 bg-bg-surface rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${convictionColor(pct)}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface ProposalCardProps {
  proposal: MockProposal;
  isConnected: boolean;
}

function ProposalCard({ proposal, isConnected }: ProposalCardProps) {
  const [stakeInput, setStakeInput] = useState("");
  const { writeContract, isPending } = useWriteContract();

  function handleStake() {
    if (!stakeInput || !isConnected) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONVICTION_VOTING_ABI,
      functionName: "stakeOnProposal",
      args: [BigInt(proposal.id), parseEther(stakeInput)],
    });
  }

  const pct = Math.min(Math.round((proposal.conviction / proposal.threshold) * 100), 100);

  return (
    <div className="bg-bg-card border border-border rounded-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-dim bg-bg-surface px-1.5 py-0.5 rounded">
            #{proposal.id}
          </span>
          <h3 className="font-sans text-sm font-medium text-text-primary">{proposal.title}</h3>
        </div>
        <span
          className={`font-mono text-[10px] px-2 py-0.5 rounded shrink-0 ${
            proposal.daysLeft <= 2 ? "text-accent-red bg-accent-red/10" : "text-text-muted bg-bg-surface"
          }`}
        >
          {proposal.daysLeft}d left
        </span>
      </div>

      <p className="font-mono text-xs text-text-dim mb-3">
        {proposal.proposer} · Ξ {proposal.requestedAmount.toFixed(2)} requested
      </p>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-text-dim">Conviction</span>
          <span className="font-mono text-[10px] text-text-muted">{pct}%</span>
        </div>
        <ConvictionBar conviction={proposal.conviction} threshold={proposal.threshold} />
        <p className="font-mono text-[10px] text-text-dim mt-1">
          {proposal.staked.toLocaleString()} tokens staked
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={stakeInput}
          onChange={(e) => setStakeInput(e.target.value)}
          placeholder="Amount (tokens)"
          className="flex-1 bg-bg-surface border border-border rounded px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
        />
        <button
          onClick={handleStake}
          disabled={!isConnected || isPending || !stakeInput}
          className="font-mono text-xs bg-accent-green text-bg-page px-4 py-1.5 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-green/90 transition-colors"
        >
          {isPending ? "Staking…" : "Stake conviction"}
        </button>
      </div>
      {!isConnected && (
        <p className="font-mono text-[10px] text-text-dim mt-1">Connect wallet to stake</p>
      )}
    </div>
  );
}

export function ProposalList() {
  const { isConnected } = useAccount();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-text-primary">Governance Proposals</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="font-mono text-xs bg-accent-green text-bg-page px-4 py-2 rounded font-medium hover:bg-accent-green/90 transition-colors"
        >
          + New Proposal
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_PROPOSALS.map((p) => (
          <ProposalCard key={p.id} proposal={p} isConnected={isConnected} />
        ))}
      </div>

      {showCreate && <CreateProposalModal onClose={() => setShowCreate(false)} />}
    </section>
  );
}
