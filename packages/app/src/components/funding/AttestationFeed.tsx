"use client";

import { useEffect, useState } from "react";
import { IMPACT_ATTESTATION_ABI } from "@commonwealth/sdk";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { formatEth, formatRelativeTime, truncateAddress } from "@/lib/format";
import { encodeMetadataUri } from "@/lib/metadata";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";

function SubmitAttestationCard() {
  const refreshProtocolData = useRefreshProtocolData();
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reward, setReward] = useState("");

  useEffect(() => {
    if (isSuccess) {
      setTitle("");
      setSummary("");
      setEvidence("");
      setReward("");
      void refreshProtocolData();
    }
  }, [isSuccess, refreshProtocolData]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    writeContract({
      address: CONTRACTS.impactAttestation,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "submit",
      args: [
        encodeMetadataUri({ title, evidence, createdAt: new Date().toISOString() }),
        encodeMetadataUri({ title, summary, createdAt: new Date().toISOString() }),
        parseEther(reward),
      ],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-card border border-border rounded-card p-5 space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-cyan mb-2">Submit work</p>
        <h3 className="font-serif text-2xl text-text-primary">Create a retroactive funding request</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Work title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Requested ETH</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={reward}
            onChange={(event) => setReward(event.target.value)}
            className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
          />
        </label>
      </div>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Summary</span>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan resize-none"
        />
      </label>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Evidence notes</span>
        <textarea
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          rows={3}
          className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan resize-none"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-xs rounded-full px-4 py-2 bg-accent-cyan text-bg-page disabled:opacity-40"
      >
        {isPending ? "Submitting" : "Submit for attestation"}
      </button>
    </form>
  );
}

export function AttestationFeed() {
  const { address } = useAccount();
  const { data } = useProtocolData();
  const refreshProtocolData = useRefreshProtocolData();
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      void refreshProtocolData();
    }
  }, [isSuccess, refreshProtocolData]);

  return (
    <section id="impact" className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-cyan mb-2">Impact funding</p>
        <h2 className="font-serif text-3xl text-text-primary">Attest work, confirm outcomes, claim rewards</h2>
      </div>

      <SubmitAttestationCard />

      <div className="space-y-4">
        {data?.attestations.map((attestation) => (
          <article key={attestation.id.toString()} className="bg-bg-card border border-border rounded-card p-5 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim bg-bg-surface border border-border rounded-full px-2 py-1">
                    {attestation.status}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
                    {formatRelativeTime(attestation.submittedAt)}
                  </span>
                </div>
                <h3 className="font-serif text-2xl text-text-primary">
                  {attestation.description?.title?.toString() ?? "Impact attestation"}
                </h3>
                <p className="text-sm text-text-muted mt-2">
                  {attestation.description?.summary?.toString() ?? "Onchain description metadata available."}
                </p>
              </div>
              <div className="text-left lg:text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">Reward</p>
                <p className="font-mono text-xl text-text-primary">{formatEth(attestation.requestedReward)} ETH</p>
                <p className="font-mono text-xs text-text-dim mt-1">{truncateAddress(attestation.contributor)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Confirmations</p>
                <p className="font-mono text-lg text-text-primary">{attestation.confirmations.toString()}</p>
              </div>
              <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Rejections</p>
                <p className="font-mono text-lg text-text-primary">{attestation.rejections.toString()}</p>
              </div>
              <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Evidence</p>
                <p className="font-mono text-xs text-text-primary">{attestation.proof?.evidence?.toString() ?? "Encoded metadata attached"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {attestation.status === "Pending" && !attestation.hasVoted && (
                <>
                  <button
                    onClick={() =>
                      writeContract({
                        address: CONTRACTS.impactAttestation,
                        abi: IMPACT_ATTESTATION_ABI,
                        functionName: "confirm",
                        args: [attestation.id],
                      })
                    }
                    disabled={isPending}
                    className="font-mono text-xs rounded-full px-4 py-2 border border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10 disabled:opacity-40"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() =>
                      writeContract({
                        address: CONTRACTS.impactAttestation,
                        abi: IMPACT_ATTESTATION_ABI,
                        functionName: "reject",
                        args: [attestation.id],
                      })
                    }
                    disabled={isPending}
                    className="font-mono text-xs rounded-full px-4 py-2 border border-accent-red/40 text-accent-red bg-accent-red/10 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </>
              )}

              {attestation.status === "Confirmed" && address?.toLowerCase() === attestation.contributor.toLowerCase() && (
                <button
                  onClick={() =>
                    writeContract({
                      address: CONTRACTS.impactAttestation,
                      abi: IMPACT_ATTESTATION_ABI,
                      functionName: "claim",
                      args: [attestation.id],
                    })
                  }
                  disabled={isPending}
                  className="font-mono text-xs rounded-full px-4 py-2 bg-accent-green text-bg-page disabled:opacity-40"
                >
                  Claim reward
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
