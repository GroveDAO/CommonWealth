"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseUnits, isAddress } from "viem";
import { SAVINGS_CIRCLE_ABI } from "@commonwealth/sdk";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_SAVINGS_CIRCLE_ADDRESS ?? "0x0") as `0x${string}`;

const CYCLE_OPTIONS = [
  { label: "Daily", value: 86400 },
  { label: "Weekly", value: 604800 },
  { label: "Monthly", value: 2592000 },
  { label: "Custom", value: 0 },
];

interface CreateCircleModalProps {
  onClose: () => void;
}

export function CreateCircleModal({ onClose }: CreateCircleModalProps) {
  const [name, setName] = useState("");
  const [contribution, setContribution] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [cycleDuration, setCycleDuration] = useState("604800");
  const [customDuration, setCustomDuration] = useState("");
  const [maxMembers, setMaxMembers] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, isPending, isSuccess } = useWriteContract();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name || !contribution || !tokenAddress) {
      setError("All fields are required.");
      return;
    }
    if (!isAddress(tokenAddress)) {
      setError("Invalid token address.");
      return;
    }

    const duration =
      cycleDuration === "0" ? BigInt(Number(customDuration) * 86400) : BigInt(cycleDuration);

    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: "create",
        args: [name, parseUnits(contribution, 18), duration, BigInt(maxMembers), tokenAddress as `0x${string}`],
      },
      {
        onError: (err) => setError(err.message),
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page/80 backdrop-blur z-50 absolute inset-0">
      <div className="bg-bg-card border border-border rounded-card w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-text-primary">Create Savings Circle</h2>
          <button onClick={onClose} className="font-mono text-text-dim hover:text-text-muted text-lg">
            ×
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-8">
            <p className="font-mono text-accent-green text-sm mb-4">Circle created!</p>
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
                Circle Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
                placeholder="e.g. Builder Collective"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Contribution Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
                placeholder="100.00"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Token Address
              </label>
              <input
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
                placeholder="0x..."
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Cycle Duration
              </label>
              <select
                value={cycleDuration}
                onChange={(e) => setCycleDuration(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:border-border-hover"
              >
                {CYCLE_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value.toString()}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {cycleDuration === "0" && (
                <input
                  type="number"
                  min="1"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="Days"
                  className="mt-2 w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
                />
              )}
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Max Members: {maxMembers}
              </label>
              <input
                type="range"
                min={2}
                max={20}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className="w-full accent-accent-purple"
              />
              <div className="flex justify-between mt-0.5">
                <span className="font-mono text-[10px] text-text-dim">2</span>
                <span className="font-mono text-[10px] text-text-dim">20</span>
              </div>
            </div>

            {error && <p className="font-mono text-xs text-accent-red">{error}</p>}

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
                disabled={isPending}
                className="flex-1 font-mono text-xs bg-accent-purple text-bg-page px-4 py-2 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-purple/90 transition-colors"
              >
                {isPending ? "Creating…" : "Create Circle"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
