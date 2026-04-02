"use client";

import { useMemo, useState } from "react";
import { COMMONWEALTH_TOKEN_ABI, CONVICTION_VOTING_ABI } from "@commonwealth/sdk";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { EmptySurface, SurfaceBanner } from "@/components/shared/SurfaceFeedback";
import { useContractAction } from "@/hooks/useContractAction";
import { CONTRACTS, contractsAreConfigured } from "@/lib/contracts";
import { formatDate, formatEth, formatToken, truncateAddress } from "@/lib/format";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";
import { CreateProposalModal } from "./CreateProposalModal";

function ProposalCard({
  proposalId,
  title,
  summary,
  proposer,
  requestedAmount,
  conviction,
  threshold,
  myStake,
  canExecute,
  tokenAllowance,
}: {
  proposalId: bigint;
  title: string;
  summary: string;
  proposer: string;
  requestedAmount: bigint;
  conviction: bigint;
  threshold: bigint;
  myStake: bigint;
  canExecute: boolean;
  tokenAllowance: bigint;
}) {
  const refreshProtocolData = useRefreshProtocolData();
  const { isConnected } = useAccount();
  const contractAction = useContractAction(refreshProtocolData);
  const [amount, setAmount] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const parsedAmount = useMemo(() => {
    if (!amount) return null;
    try {
      return parseEther(amount);
    } catch {
      return null;
    }
  }, [amount]);

  const needsApproval = parsedAmount !== null && parsedAmount > 0n && tokenAllowance < parsedAmount;
  const progress = threshold === 0n ? 0 : Number((conviction * 100n) / threshold);

  async function handlePrimaryAction() {
    setInputError(null);

    if (parsedAmount === null || parsedAmount <= 0n) {
      setInputError("Enter a stake amount greater than 0.");
      return;
    }

    if (needsApproval) {
      await contractAction.execute({
        address: CONTRACTS.token,
        abi: COMMONWEALTH_TOKEN_ABI,
        functionName: "approve",
        args: [CONTRACTS.convictionVoting, parsedAmount * 10n],
      });
      return;
    }

    await contractAction.execute({
      address: CONTRACTS.convictionVoting,
      abi: CONVICTION_VOTING_ABI,
      functionName: "stakeOnProposal",
      args: [proposalId, parsedAmount],
    });

    setAmount("");
  }

  async function handleExecute() {
    setInputError(null);
    await contractAction.execute({
      address: CONTRACTS.convictionVoting,
      abi: CONVICTION_VOTING_ABI,
      functionName: "executeProposal",
      args: [proposalId],
    });
  }

  return (
    <article className="bg-bg-card border border-border rounded-card p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim bg-bg-surface border border-border rounded-full px-2 py-1">
              Proposal #{proposalId.toString()}
            </span>
            {canExecute && (
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-green bg-accent-green/10 border border-accent-green/30 rounded-full px-2 py-1">
                Ready to execute
              </span>
            )}
          </div>
          <h3 className="font-serif text-2xl text-text-primary">{title}</h3>
          <p className="text-sm text-text-muted max-w-3xl">{summary}</p>
        </div>
        <div className="text-left lg:text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">Requested</p>
          <p className="font-mono text-xl text-text-primary">{formatEth(requestedAmount)} ETH</p>
          <p className="font-mono text-xs text-text-dim mt-1">{truncateAddress(proposer)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">Conviction</p>
          <p className="font-mono text-sm text-text-primary mb-2">{Math.min(progress, 999).toFixed(0)}%</p>
          <div className="h-2 rounded-full bg-bg-surface overflow-hidden">
            <div
              className={`h-full rounded-full ${progress >= 100 ? "bg-accent-green" : progress >= 60 ? "bg-accent-yellow" : "bg-accent-purple"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">Current / threshold</p>
          <p className="font-mono text-sm text-text-primary">
            {formatToken(conviction)} / {formatToken(threshold)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">Your stake</p>
          <p className="font-mono text-sm text-text-primary">{formatToken(myStake)} CWT</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="number"
          min="0"
          step="0.1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="flex-1 rounded-full border border-border bg-bg-surface px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-green"
        />
        <button
          onClick={() => void handlePrimaryAction()}
          disabled={!contractsAreConfigured() || !isConnected || contractAction.isPending || parsedAmount === null}
          className="font-mono text-xs rounded-full px-4 py-2 bg-accent-green text-bg-page disabled:opacity-40"
        >
          {needsApproval ? "Approve CWT" : contractAction.isPending ? "Confirming" : "Stake conviction"}
        </button>
        {canExecute && (
          <button
            onClick={() => void handleExecute()}
            disabled={contractAction.isPending}
            className="font-mono text-xs rounded-full px-4 py-2 border border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10 disabled:opacity-40"
          >
            Execute
          </button>
        )}
      </div>

      {inputError || contractAction.error ? (
        <SurfaceBanner tone="error" title="Proposal action failed" detail={inputError ?? contractAction.error ?? ""} />
      ) : null}
    </article>
  );
}

export function ProposalList() {
  const [showCreate, setShowCreate] = useState(false);
  const { data } = useProtocolData();
  const tokenAllowance = data?.wallet?.convictionAllowance ?? 0n;

  return (
    <section id="governance" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-green mb-2">Funding decisions</p>
          <h2 className="font-serif text-3xl text-text-primary">Back the work that should move forward next</h2>
          <p className="text-sm text-text-muted mt-2">
            Review requests, add support where it matters, and release funds once a proposal has enough backing.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="font-mono text-xs rounded-full px-4 py-2 bg-accent-green text-bg-page w-fit"
        >
          New proposal
        </button>
      </div>

      <div className="space-y-4">
        {data && data.proposals.length === 0 ? (
          <EmptySurface
            title="No treasury proposals yet"
            detail="Create the first funding request or check back when new work is proposed."
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="font-mono text-xs rounded-full px-4 py-2 bg-accent-green text-bg-page"
              >
                New proposal
              </button>
            }
          />
        ) : null}

        {data?.proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id.toString()}
            proposalId={proposal.id}
            title={proposal.metadata?.title?.toString() ?? `Proposal ${proposal.id.toString()}`}
            summary={proposal.metadata?.summary?.toString() ?? "Funding request details are attached to this proposal."}
            proposer={proposal.proposer}
            requestedAmount={proposal.requestedAmount}
            conviction={proposal.currentConviction}
            threshold={proposal.threshold}
            myStake={proposal.myStake}
            canExecute={!proposal.executed && !proposal.cancelled && proposal.threshold > 0n && proposal.currentConviction >= proposal.threshold}
            tokenAllowance={tokenAllowance}
          />
        ))}
      </div>

      {showCreate && <CreateProposalModal onClose={() => setShowCreate(false)} />}
    </section>
  );
}
