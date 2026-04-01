"use client";

import { useEffect, useState } from "react";
import { CONVICTION_VOTING_ABI } from "@commonwealth/sdk";
import { isAddress, parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { encodeMetadataUri } from "@/lib/metadata";
import { useRefreshProtocolData } from "@/hooks/useProtocolData";

interface CreateProposalModalProps {
  onClose: () => void;
}

export function CreateProposalModal({ onClose }: CreateProposalModalProps) {
  const { address } = useAccount();
  const refreshProtocolData = useRefreshProtocolData();
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState(address ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSuccess) {
      void refreshProtocolData();
      onClose();
    }
  }, [isSuccess, onClose, refreshProtocolData]);

  useEffect(() => {
    if (address) {
      setBeneficiary(address);
    }
  }, [address]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title || !summary || !requestedAmount || !beneficiary) {
      setError("Every field is required.");
      return;
    }

    if (!isAddress(beneficiary)) {
      setError("Beneficiary address is invalid.");
      return;
    }

    writeContract({
      address: CONTRACTS.convictionVoting,
      abi: CONVICTION_VOTING_ABI,
      functionName: "createProposal",
      args: [
        encodeMetadataUri({
          title,
          summary,
          createdAt: new Date().toISOString(),
          lane: "public-governance",
        }),
        parseEther(requestedAmount),
        beneficiary,
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

          {error && <p className="font-mono text-xs text-accent-red">{error}</p>}

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
              disabled={isPending}
              className="font-mono text-xs rounded-full px-4 py-2 bg-accent-green text-bg-page disabled:opacity-40"
            >
              {isPending ? "Submitting" : "Submit proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
