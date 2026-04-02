"use client";

import { useState } from "react";
import { DEPIN_REGISTRY_ABI, DataType } from "@commonwealth/sdk";
import { EmptySurface, SurfaceBanner } from "@/components/shared/SurfaceFeedback";
import { useContractAction } from "@/hooks/useContractAction";
import { CONTRACTS, contractsAreConfigured } from "@/lib/contracts";
import { decryptDatasetAccessUri, isLitProtectedUri } from "@/lib/lit";
import { getErrorMessage } from "@/lib/errors";
import { formatRelativeTime, formatToken, truncateAddress } from "@/lib/format";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";
import { isStorachaGatewayUrl } from "@/lib/storacha";
import { SubmitDataModal } from "./SubmitDataModal";

const DATA_LABELS: Record<DataType, string> = {
  [DataType.Environmental]: "Environmental",
  [DataType.Infrastructure]: "Infrastructure",
  [DataType.Compute]: "Compute",
  [DataType.Storage]: "Storage",
  [DataType.Bandwidth]: "Bandwidth",
};

function SubmissionCard({
  submission,
}: {
  submission: NonNullable<ReturnType<typeof useProtocolData>["data"]>["submissions"][number];
}) {
  const refreshProtocolData = useRefreshProtocolData();
  const claimAction = useContractAction(refreshProtocolData);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptedAccessUri, setDecryptedAccessUri] = useState<string | null>(null);

  const isProtectedAccess = isLitProtectedUri(submission.accessURI);
  const isStorachaAsset =
    submission.metadata?.storageProvider === "storacha" ||
    Boolean(submission.metadata?.storachaCid) ||
    isStorachaGatewayUrl(decryptedAccessUri ?? submission.accessURI);

  async function handleDecryptAccess() {
    try {
      setDecryptError(null);
      setDecrypting(true);
      const unlockedUri = await decryptDatasetAccessUri(submission.accessURI);
      setDecryptedAccessUri(unlockedUri);
    } catch (nextError) {
      setDecryptError(getErrorMessage(nextError, "Unable to decrypt the protected dataset link."));
    } finally {
      setDecrypting(false);
    }
  }

  return (
    <article className="bg-bg-card border border-border rounded-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim bg-bg-surface border border-border rounded-full px-2 py-1">
              {DATA_LABELS[submission.dataType]}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
              {formatRelativeTime(submission.submittedAt)}
            </span>
            {isProtectedAccess ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-purple bg-accent-purple/10 border border-accent-purple/30 rounded-full px-2 py-1">
                Member-only
              </span>
            ) : null}
            {isStorachaAsset ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/30 rounded-full px-2 py-1">
                Archived
              </span>
            ) : null}
          </div>
          <h3 className="font-serif text-2xl text-text-primary">
            {submission.metadata?.title?.toString() ?? "DePIN submission"}
          </h3>
          <p className="text-sm text-text-muted mt-2">
            {submission.metadata?.summary?.toString() ?? "Dataset details are attached to this listing."}
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
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Review status</p>
          <p className="font-mono text-sm text-text-primary">{submission.verified ? "Verified" : "Pending review"}</p>
        </div>
        <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Quality</p>
          <p className="font-mono text-sm text-text-primary">{submission.quality.toString()} / 100</p>
        </div>
        <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Region</p>
          <p className="font-mono text-sm text-text-primary">{submission.metadata?.region?.toString() ?? "Not specified"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {isProtectedAccess ? (
          decryptedAccessUri ? (
            <a
              href={decryptedAccessUri}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs rounded-full px-4 py-2 border border-border text-text-primary hover:border-border-hover"
            >
              Open protected dataset
            </a>
          ) : (
            <button
              onClick={() => void handleDecryptAccess()}
              disabled={decrypting}
              className="font-mono text-xs rounded-full px-4 py-2 border border-accent-purple/40 text-accent-purple bg-accent-purple/10 disabled:opacity-40"
            >
              {decrypting ? "Unlocking" : "Unlock access"}
            </button>
          )
        ) : (
          <a
            href={submission.accessURI}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs rounded-full px-4 py-2 border border-border text-text-primary hover:border-border-hover"
          >
            Open dataset
          </a>
        )}

        {submission.verified && !submission.claimed ? (
          <button
            onClick={() =>
              void claimAction.execute({
                address: CONTRACTS.depinRegistry,
                abi: DEPIN_REGISTRY_ABI,
                functionName: "claim",
                args: [submission.id],
              })
            }
            disabled={!contractsAreConfigured() || claimAction.isPending}
            className="font-mono text-xs rounded-full px-4 py-2 bg-accent-yellow text-bg-page disabled:opacity-40"
          >
            Claim reward
          </button>
        ) : null}
        {submission.claimed ? (
          <span className="font-mono text-xs rounded-full px-4 py-2 border border-accent-green/40 text-accent-green bg-accent-green/10">
            Reward claimed
          </span>
        ) : null}
      </div>

      {decryptError || claimAction.error ? (
        <SurfaceBanner tone="error" title="Dataset action failed" detail={decryptError ?? claimAction.error ?? ""} />
      ) : null}
    </article>
  );
}

export function DePINMarketplace() {
  const { data } = useProtocolData();
  const [showSubmit, setShowSubmit] = useState(false);
  const [activeType, setActiveType] = useState<DataType | "All">("All");

  const submissions = data?.submissions.filter((submission) =>
    activeType === "All" ? true : submission.dataType === activeType,
  );

  return (
    <section id="depin" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-yellow mb-2">Data marketplace</p>
          <h2 className="font-serif text-3xl text-text-primary">Share operational datasets and reward verified contributors</h2>
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
        {data && (submissions?.length ?? 0) === 0 ? (
          <EmptySurface
            title="No datasets match this view"
            detail="Switch filters, publish a new dataset, or check back when new listings arrive."
          />
        ) : null}

        {submissions?.map((submission) => (
          <SubmissionCard key={submission.id.toString()} submission={submission} />
        ))}
      </div>

      {showSubmit && <SubmitDataModal onClose={() => setShowSubmit(false)} />}
    </section>
  );
}
