"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { IMPACT_ATTESTATION_ABI } from "@commonwealth/sdk";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_IMPACT_ATTESTATION_ADDRESS ?? "0x0") as `0x${string}`;

interface MockAttestation {
  id: number;
  contributor: string;
  proofCID: string;
  description: string;
  confirmations: number;
  submittedAt: number;
  reward: number;
  status: "Pending" | "Confirmed" | "Rewarded" | "Rejected";
}

const MOCK_ATTESTATIONS: MockAttestation[] = [
  {
    id: 1,
    contributor: "0xabc123...def456",
    proofCID: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    description: "Deployed Filecoin storage nodes for 6 months, providing 50TB to network.",
    confirmations: 3,
    submittedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    reward: 0.5,
    status: "Confirmed",
  },
  {
    id: 2,
    contributor: "0x789abc...123def",
    proofCID: "bafybeif2pall7dybz7vecqka3srzrvhkfj5qlrfzlnf3eyxyx26skewqei",
    description: "Built NEAR ↔ EVM bridge for cross-chain governance participation.",
    confirmations: 1,
    submittedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    reward: 0.8,
    status: "Pending",
  },
  {
    id: 3,
    contributor: "0xfed321...654abc",
    proofCID: "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq",
    description: "Implemented Lit Protocol access conditions for 3 DePIN data streams.",
    confirmations: 2,
    submittedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    reward: 0.3,
    status: "Pending",
  },
  {
    id: 4,
    contributor: "0x456789...abcdef",
    proofCID: "bafybeigvgzoolc3diraekgoar7yvnk7kxrywbppwdgxhegbvyzuiyriosu",
    description: "Starknet ZK voting circuit audit and formal verification.",
    confirmations: 3,
    submittedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    reward: 1.2,
    status: "Rewarded",
  },
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function timeRemaining(submittedAt: number): string {
  const windowMs = 14 * 24 * 60 * 60 * 1000;
  const remaining = windowMs - (Date.now() - submittedAt);
  if (remaining <= 0) return "Expired";
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  return `${days}d remaining`;
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "text-accent-yellow bg-accent-yellow/10",
  Confirmed: "text-accent-cyan bg-accent-cyan/10",
  Rewarded: "text-accent-green bg-accent-green/10",
  Rejected: "text-accent-red bg-accent-red/10",
};

export function AttestationFeed() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [showModal, setShowModal] = useState(false);

  function handleConfirm(id: number) {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "confirm",
      args: [BigInt(id)],
    });
  }

  function handleReject(id: number) {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "reject",
      args: [BigInt(id)],
    });
  }

  function handleClaim(id: number) {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "claim",
      args: [BigInt(id)],
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-text-primary">Impact Attestations</h2>
        <button
          onClick={() => setShowModal(true)}
          className="font-mono text-xs bg-accent-cyan text-bg-page px-4 py-2 rounded font-medium hover:bg-accent-cyan/90 transition-colors"
        >
          Submit Work
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_ATTESTATIONS.map((att) => (
          <div key={att.id} className="bg-bg-card border border-border rounded-card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-mono text-xs text-text-muted mb-1">{att.contributor}</p>
                <p className="font-sans text-sm text-text-primary">{att.description}</p>
              </div>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded shrink-0 ${STATUS_STYLES[att.status]}`}>
                {att.status}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <a
                href={`https://${att.proofCID}.ipfs.w3s.link`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-accent-cyan hover:underline truncate max-w-xs"
              >
                {att.proofCID.slice(0, 20)}…
              </a>
              <span className="font-mono text-[10px] text-text-dim">{timeAgo(att.submittedAt)}</span>
              <span className="font-mono text-[10px] text-text-dim">{timeRemaining(att.submittedAt)}</span>
            </div>

            {/* Confirmation dots */}
            <div className="flex items-center gap-2 mb-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border ${
                    i < att.confirmations
                      ? "bg-accent-cyan border-accent-cyan"
                      : "bg-bg-surface border-border"
                  }`}
                />
              ))}
              <span className="font-mono text-[10px] text-text-dim ml-1">
                {att.confirmations}/3 confirmations
              </span>
              <span className="font-mono text-xs text-text-muted ml-auto">
                Ξ {att.reward.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2">
              {att.status === "Pending" && isConnected && (
                <>
                  <button
                    onClick={() => handleConfirm(att.id)}
                    disabled={isPending}
                    className="font-mono text-xs border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10 px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleReject(att.id)}
                    disabled={isPending}
                    className="font-mono text-xs border border-accent-red/40 text-accent-red hover:bg-accent-red/10 px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                  >
                    Reject
                  </button>
                </>
              )}
              {att.status === "Confirmed" &&
                isConnected &&
                address?.toLowerCase() === att.contributor.toLowerCase() && (
                  <button
                    onClick={() => handleClaim(att.id)}
                    disabled={isPending}
                    className="font-mono text-xs bg-accent-green text-bg-page px-4 py-1.5 rounded font-medium disabled:opacity-40 hover:bg-accent-green/90 transition-colors"
                  >
                    Claim Reward
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="min-h-screen flex items-center justify-center bg-bg-page/80 backdrop-blur z-50 absolute inset-0">
          <div className="bg-bg-card border border-border rounded-card p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-text-primary">Submit Work</h3>
              <button onClick={() => setShowModal(false)} className="font-mono text-text-dim text-lg">
                ×
              </button>
            </div>
            <p className="font-mono text-xs text-text-dim">
              Upload your proof to Filecoin and submit for attestation.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 font-mono text-xs border border-border text-text-muted px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
