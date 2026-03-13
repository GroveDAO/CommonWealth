"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { DEPIN_REGISTRY_ABI, DataType } from "@commonwealth/sdk";
import { SubmitDataModal } from "./SubmitDataModal";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_DEPIN_REGISTRY_ADDRESS ?? "0x0") as `0x${string}`;

interface MockSubmission {
  id: number;
  dtype: DataType;
  description: string;
  contributor: string;
  cid: string;
  quality: number;
  reward: number;
  tier: string;
  verified: boolean;
  claimed: boolean;
}

const DATA_TYPE_LABELS: Record<DataType, string> = {
  [DataType.Environmental]: "Environmental",
  [DataType.Infrastructure]: "Infrastructure",
  [DataType.Compute]: "Compute",
  [DataType.Storage]: "Storage",
  [DataType.Bandwidth]: "Bandwidth",
};

const DATA_TYPE_COLORS: Record<DataType, string> = {
  [DataType.Environmental]: "text-accent-green bg-accent-green/10",
  [DataType.Infrastructure]: "text-accent-cyan bg-accent-cyan/10",
  [DataType.Compute]: "text-accent-purple bg-accent-purple/10",
  [DataType.Storage]: "text-accent-yellow bg-accent-yellow/10",
  [DataType.Bandwidth]: "text-accent-red bg-accent-red/10",
};

const MOCK_SUBMISSIONS: MockSubmission[] = [
  {
    id: 1,
    dtype: DataType.Environmental,
    description: "Air quality sensor data from 42 monitoring stations in Nairobi, Kenya.",
    contributor: "0xabc123...def456",
    cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    quality: 92,
    reward: 9.2,
    tier: "gold",
    verified: true,
    claimed: false,
  },
  {
    id: 2,
    dtype: DataType.Compute,
    description: "GPU compute metrics from distributed ML training cluster (1000+ hours).",
    contributor: "0x789abc...123def",
    cid: "bafybeif2pall7dybz7vecqka3srzrvhkfj5qlrfzlnf3eyxyx26skewqei",
    quality: 78,
    reward: 15.6,
    tier: "silver",
    verified: true,
    claimed: true,
  },
  {
    id: 3,
    dtype: DataType.Infrastructure,
    description: "Node uptime and latency data for 15 global infrastructure nodes.",
    contributor: "0xfed321...654abc",
    cid: "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq",
    quality: 85,
    reward: 12.75,
    tier: "platinum",
    verified: true,
    claimed: false,
  },
  {
    id: 4,
    dtype: DataType.Storage,
    description: "Filecoin storage proof metrics across 3 storage providers.",
    contributor: "0x456789...abcdef",
    cid: "bafybeigvgzoolc3diraekgoar7yvnk7kxrywbppwdgxhegbvyzuiyriosu",
    quality: 63,
    reward: 5.04,
    tier: "bronze",
    verified: true,
    claimed: false,
  },
  {
    id: 5,
    dtype: DataType.Bandwidth,
    description: "Network bandwidth utilisation from 8 global peering points.",
    contributor: "0x123def...456abc",
    cid: "bafybeib5bfmkwqxgfijlrveqxzfpqavt7fqpkxcfjvdqxhg2bhkqfiwmle",
    quality: 71,
    reward: 3.55,
    tier: "bronze",
    verified: false,
    claimed: false,
  },
];

const TIER_STYLES: Record<string, string> = {
  bronze: "text-text-muted bg-bg-surface",
  silver: "text-text-primary bg-bg-surface",
  gold: "text-accent-yellow bg-accent-yellow/10",
  platinum: "text-accent-cyan bg-accent-cyan/10",
};

export function DePINMarketplace() {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [activeType, setActiveType] = useState<DataType | "All">("All");
  const [showSubmit, setShowSubmit] = useState(false);

  const filtered =
    activeType === "All"
      ? MOCK_SUBMISSIONS
      : MOCK_SUBMISSIONS.filter((s) => s.dtype === activeType);

  function handleClaim(id: number) {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "claim",
      args: [BigInt(id)],
    });
  }

  const totalSubmissions = MOCK_SUBMISSIONS.length;
  const totalRewards = MOCK_SUBMISSIONS.reduce((acc, s) => acc + (s.claimed ? s.reward : 0), 0);
  const uniqueContributors = new Set(MOCK_SUBMISSIONS.map((s) => s.contributor)).size;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl text-text-primary">DePIN Marketplace</h2>
        <button
          onClick={() => setShowSubmit(true)}
          className="font-mono text-xs bg-accent-yellow text-bg-page px-4 py-2 rounded font-medium hover:bg-accent-yellow/90 transition-colors"
        >
          Submit Data
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-border mb-6">
        <div className="bg-bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim mb-1">
            Total Submissions
          </p>
          <p className="font-mono text-xl text-text-primary">{totalSubmissions.toLocaleString()}</p>
        </div>
        <div className="bg-bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim mb-1">
            Rewards Distributed
          </p>
          <p className="font-mono text-xl text-text-primary">{totalRewards.toFixed(2)} tokens</p>
        </div>
        <div className="bg-bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim mb-1">
            Contributors
          </p>
          <p className="font-mono text-xl text-text-primary">{uniqueContributors}</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["All", ...Object.values(DataType).filter((v) => typeof v === "number")] as (DataType | "All")[]).map(
          (type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`font-mono text-xs px-3 py-1 rounded border transition-colors ${
                activeType === type
                  ? "bg-accent-yellow/10 border-accent-yellow text-accent-yellow"
                  : "border-border text-text-dim hover:border-border-hover"
              }`}
            >
              {type === "All" ? "All" : DATA_TYPE_LABELS[type as DataType]}
            </button>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border">
        {filtered.map((sub) => (
          <div key={sub.id} className="bg-bg-card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${DATA_TYPE_COLORS[sub.dtype]}`}>
                  {DATA_TYPE_LABELS[sub.dtype]}
                </span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${TIER_STYLES[sub.tier]}`}>
                  {sub.tier}
                </span>
              </div>
              {sub.verified && (
                <span className="font-mono text-[10px] text-accent-green">✓ Verified</span>
              )}
            </div>

            <p className="font-sans text-sm text-text-primary mb-2">{sub.description}</p>
            <p className="font-mono text-xs text-text-dim mb-3">{sub.contributor}</p>

            <a
              href={`https://${sub.cid}.ipfs.w3s.link`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-accent-cyan hover:underline block mb-3 truncate"
            >
              {sub.cid.slice(0, 24)}…
            </a>

            {sub.verified && (
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[10px] text-text-dim">Quality Score</span>
                  <span className="font-mono text-[10px] text-text-muted">{sub.quality}/100</span>
                </div>
                <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-yellow rounded-full"
                    style={{ width: `${sub.quality}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-text-primary">
                {sub.reward.toFixed(2)} tokens
              </span>
              <div className="flex gap-2">
                <a
                  href={`https://${sub.cid}.ipfs.w3s.link`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs border border-border text-text-muted hover:border-border-hover px-3 py-1.5 rounded transition-colors"
                >
                  Access Data →
                </a>
                {sub.verified && !sub.claimed && isConnected && (
                  <button
                    onClick={() => handleClaim(sub.id)}
                    disabled={isPending}
                    className="font-mono text-xs bg-accent-yellow/20 border border-accent-yellow/40 text-accent-yellow px-3 py-1.5 rounded hover:bg-accent-yellow/30 transition-colors disabled:opacity-40"
                  >
                    Claim
                  </button>
                )}
                {sub.claimed && (
                  <span className="font-mono text-xs text-text-dim px-3 py-1.5">Claimed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showSubmit && <SubmitDataModal onClose={() => setShowSubmit(false)} />}
    </section>
  );
}
