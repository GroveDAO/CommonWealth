"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseEther, isAddress } from "viem";
import { CONVICTION_VOTING_ABI } from "@commonwealth/sdk";
import { useFilecoin } from "@/hooks/useFilecoin";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONVICTION_VOTING_ADDRESS ?? "0x0") as `0x${string}`;

interface CreateProposalModalProps {
  onClose: () => void;
}

export function CreateProposalModal({ onClose }: CreateProposalModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [step, setStep] = useState<"form" | "uploading" | "submitting" | "done">("form");
  const [error, setError] = useState<string | null>(null);

  const { uploadJSON, isUploading } = useFilecoin();
  const { writeContract, isPending } = useWriteContract();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title || !description || !amount || !beneficiary) {
      setError("All fields are required.");
      return;
    }
    if (!isAddress(beneficiary)) {
      setError("Invalid beneficiary address.");
      return;
    }

    try {
      setStep("uploading");
      const cid = await uploadJSON({ title, description, createdAt: Date.now() });

      setStep("submitting");
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: CONVICTION_VOTING_ABI,
          functionName: "createProposal",
          args: [cid, parseEther(amount), beneficiary as `0x${string}`],
        },
        {
          onSuccess: () => setStep("done"),
          onError: (err) => {
            setError(err.message);
            setStep("form");
          },
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("form");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page/80 backdrop-blur z-50 absolute inset-0">
      <div className="bg-bg-card border border-border rounded-card w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-text-primary">New Proposal</h2>
          <button
            onClick={onClose}
            className="font-mono text-text-dim hover:text-text-muted text-lg"
          >
            ×
          </button>
        </div>

        {step === "done" ? (
          <div className="text-center py-8">
            <p className="font-mono text-accent-green text-sm mb-4">Proposal submitted!</p>
            <button
              onClick={onClose}
              className="font-mono text-xs bg-accent-green text-bg-page px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
                placeholder="Proposal title"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover resize-none"
                placeholder="Describe the proposal..."
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Requested Amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Beneficiary Address
              </label>
              <input
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
                placeholder="0x..."
              />
            </div>

            {error && (
              <p className="font-mono text-xs text-accent-red">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 font-mono text-xs border border-border text-text-muted hover:border-border-hover px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || isPending}
                className="flex-1 font-mono text-xs bg-accent-green text-bg-page px-4 py-2 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-green/90 transition-colors"
              >
                {step === "uploading"
                  ? "Uploading to Filecoin…"
                  : step === "submitting"
                    ? "Submitting tx…"
                    : "Submit Proposal"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
