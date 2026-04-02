"use client";

import { useState } from "react";
import { CONVICTION_VOTING_ABI } from "@commonwealth/sdk";
import { isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";
import { SurfaceBanner } from "@/components/shared/SurfaceFeedback";
import { useContractAction } from "@/hooks/useContractAction";
import { CONTRACTS, ZERO_ADDRESS, contractsAreConfigured } from "@/lib/contracts";
import { encodeMetadataUri } from "@/lib/metadata";
import { useRefreshProtocolData } from "@/hooks/useProtocolData";

interface CreateProposalModalProps {
  onClose: () => void;
}

export function CreateProposalModal({ onClose }: CreateProposalModalProps) {
  const { address } = useAccount();
  const refreshProtocolData = useRefreshProtocolData();
  const createProposal = useContractAction(async () => {
    await refreshProtocolData();
    onClose();
  });

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState(address ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!contractsAreConfigured()) {
      setError("This action is temporarily unavailable. Retry in a moment.");
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedSummary = summary.trim();
    const normalizedBeneficiary = beneficiary.trim();

    if (!normalizedTitle || normalizedTitle.length < 4 || !normalizedSummary || normalizedSummary.length < 12 || !requestedAmount || !normalizedBeneficiary) {
      setError("Every field is required.");
      return;
    }

    if (!isAddress(normalizedBeneficiary) || normalizedBeneficiary.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      setError("Beneficiary address is invalid.");
      return;
    }

    let parsedRequestedAmount: bigint;

    try {
      parsedRequestedAmount = parseEther(requestedAmount);
    } catch {
      setError("Requested ETH must be a valid positive amount.");
      return;
    }

    if (parsedRequestedAmount <= 0n) {
      setError("Requested ETH must be greater than 0.");
      return;
    }

    await createProposal.execute({
      address: CONTRACTS.convictionVoting,
      abi: CONVICTION_VOTING_ABI,
      functionName: "createProposal",
      args: [
        encodeMetadataUri({
          title: normalizedTitle,
          summary: normalizedSummary,
          createdAt: new Date().toISOString(),
          lane: "public-governance",
        }),
        parsedRequestedAmount,
        normalizedBeneficiary,
      ],
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-page/75 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-card border border-border bg-bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-green mb-2">New proposal</p>
            <h3 className="font-serif text-2xl text-text-primary">Publish a treasury request</h3>
          </div>
          <button onClick={onClose} className="font-mono text-sm text-text-muted hover:text-text-primary">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-green"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Summary</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-green resize-none"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Requested ETH</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={requestedAmount}
                onChange={(event) => setRequestedAmount(event.target.value)}
                className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-green"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Beneficiary</span>
              <input
                value={beneficiary}
                onChange={(event) => setBeneficiary(event.target.value)}
                className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-green"
              />
            </label>
          </div>

          {error || createProposal.error ? (
            <SurfaceBanner tone="error" title="Proposal submission failed" detail={error ?? createProposal.error ?? ""} />
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs border border-border rounded-full px-4 py-2 text-text-muted hover:text-text-primary hover:border-border-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createProposal.isPending}
              className="font-mono text-xs rounded-full px-4 py-2 bg-accent-green text-bg-page disabled:opacity-40"
            >
              {createProposal.isPending ? "Submitting" : "Submit proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
