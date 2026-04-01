"use client";

import { useEffect, useState } from "react";
import { SAVINGS_CIRCLE_ABI } from "@commonwealth/sdk";
import { parseEther } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { useRefreshProtocolData } from "@/hooks/useProtocolData";

interface CreateCircleModalProps {
  onClose: () => void;
}

const CYCLE_OPTIONS = [
  { label: "Weekly", seconds: 7 * 24 * 60 * 60 },
  { label: "Biweekly", seconds: 14 * 24 * 60 * 60 },
  { label: "Monthly", seconds: 30 * 24 * 60 * 60 },
] as const;

export function CreateCircleModal({ onClose }: CreateCircleModalProps) {
  const refreshProtocolData = useRefreshProtocolData();
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const [name, setName] = useState("");
  const [contribution, setContribution] = useState("");
  const [cycleDuration, setCycleDuration] = useState(CYCLE_OPTIONS[0].seconds.toString());
  const [maxMembers, setMaxMembers] = useState("3");

  useEffect(() => {
    if (isSuccess) {
      void refreshProtocolData();
      onClose();
    }
  }, [isSuccess, onClose, refreshProtocolData]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    writeContract({
      address: CONTRACTS.savingsCircle,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "create",
      args: [name, parseEther(contribution), BigInt(cycleDuration), BigInt(maxMembers), CONTRACTS.token],
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-page/75 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-card border border-border bg-bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-purple mb-2">New circle</p>
            <h3 className="font-serif text-2xl text-text-primary">Launch a savings rotation</h3>
          </div>
          <button onClick={onClose} className="font-mono text-sm text-text-muted hover:text-text-primary">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Circle name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Contribution</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={contribution}
                onChange={(event) => setContribution(event.target.value)}
                className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Cadence</span>
              <select
                value={cycleDuration}
                onChange={(event) => setCycleDuration(event.target.value)}
                className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
              >
                {CYCLE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.seconds.toString()}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Members</span>
              <input
                type="number"
                min="2"
                max="20"
                value={maxMembers}
                onChange={(event) => setMaxMembers(event.target.value)}
                className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
              />
            </label>
          </div>

          <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Settlement token</p>
            <p className="font-mono text-sm text-text-primary">CommonWealth Token (CWT)</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs border border-border rounded-full px-4 py-2 text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="font-mono text-xs rounded-full px-4 py-2 bg-accent-purple text-bg-page disabled:opacity-40"
            >
              {isPending ? "Creating" : "Create circle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
