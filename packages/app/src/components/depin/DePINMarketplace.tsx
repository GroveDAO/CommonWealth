"use client";

import { useEffect, useState } from "react";
import { DEPIN_REGISTRY_ABI, DataType } from "@commonwealth/sdk";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { formatRelativeTime, formatToken, truncateAddress } from "@/lib/format";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";
import { SubmitDataModal } from "./SubmitDataModal";

const DATA_LABELS: Record<DataType, string> = {
  [DataType.Environmental]: "Environmental",
  [DataType.Infrastructure]: "Infrastructure",
  [DataType.Compute]: "Compute",
  [DataType.Storage]: "Storage",
  [DataType.Bandwidth]: "Bandwidth",
};

export function DePINMarketplace() {
  const { data } = useProtocolData();
  const refreshProtocolData = useRefreshProtocolData();
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });
  const [showSubmit, setShowSubmit] = useState(false);
  const [activeType, setActiveType] = useState<DataType | "All">("All");

  useEffect(() => {
    if (isSuccess) {
      void refreshProtocolData();
    }
  }, [isSuccess, refreshProtocolData]);

  const submissions = data?.submissions.filter((submission) =>
    activeType === "All" ? true : submission.dataType === activeType,
  );

  return (
    <section id="depin" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-yellow mb-2">DePIN rewards</p>
          <h2 className="font-serif text-3xl text-text-primary">Verified infrastructure datasets with token payouts</h2>
        </div>
        <button
          onClick={() => setShowSubmit(true)}
          className="font-mono text-xs rounded-full px-4 py-2 bg-accent-yellow text-bg-page w-fit"
        >
          Submit dataset
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["All", DataType.Environmental, DataType.Infrastructure, DataType.Compute, DataType.Storage, DataType.Bandwidth] as const).map((entry) => (
          <button
            key={entry.toString()}
            onClick={() => setActiveType(entry)}
            className={`font-mono text-xs rounded-full px-3 py-1.5 border transition-colors ${
              activeType === entry
                ? "border-accent-yellow text-accent-yellow bg-accent-yellow/10"
                : "border-border text-text-muted hover:text-text-primary"
            }`}
          >
            {entry === "All" ? "All" : DATA_LABELS[entry]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {submissions?.map((submission) => (
          <article key={submission.id.toString()} className="bg-bg-card border border-border rounded-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim bg-bg-surface border border-border rounded-full px-2 py-1">
                    {DATA_LABELS[submission.dataType]}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
                    {formatRelativeTime(submission.submittedAt)}
                  </span>
                </div>
                <h3 className="font-serif text-2xl text-text-primary">
                  {submission.metadata?.title?.toString() ?? "DePIN submission"}
                </h3>
                <p className="text-sm text-text-muted mt-2">
                  {submission.metadata?.summary?.toString() ?? "Onchain dataset metadata available."}
                </p>
              </div>
              <div className="text-left lg:text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">Reward</p>
                <p className="font-mono text-xl text-text-primary">{formatToken(submission.reward)} CWT</p>
                <p className="font-mono text-xs text-text-dim mt-1">{truncateAddress(submission.contributor)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Verification</p>
                <p className="font-mono text-sm text-text-primary">{submission.verified ? "Verified" : "Awaiting oracle"}</p>
              </div>
              <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Quality</p>
                <p className="font-mono text-sm text-text-primary">{submission.quality.toString()} / 100</p>
              </div>
              <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Region</p>
                <p className="font-mono text-sm text-text-primary">{submission.metadata?.region?.toString() ?? "Onchain metadata"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={submission.accessURI}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs rounded-full px-4 py-2 border border-border text-text-primary hover:border-border-hover"
              >
                Open dataset
              </a>
              {submission.verified && !submission.claimed && (
                <button
                  onClick={() =>
                    writeContract({
                      address: CONTRACTS.depinRegistry,
                      abi: DEPIN_REGISTRY_ABI,
                      functionName: "claim",
                      args: [submission.id],
                    })
                  }
                  disabled={isPending}
                  className="font-mono text-xs rounded-full px-4 py-2 bg-accent-yellow text-bg-page disabled:opacity-40"
                >
                  Claim reward
                </button>
              )}
              {submission.claimed && (
                <span className="font-mono text-xs rounded-full px-4 py-2 border border-accent-green/40 text-accent-green bg-accent-green/10">
                  Reward claimed
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

      {showSubmit && <SubmitDataModal onClose={() => setShowSubmit(false)} />}
    </section>
  );
}
