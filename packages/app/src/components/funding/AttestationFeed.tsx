"use client";

import { useState } from "react";
import { IMPACT_ATTESTATION_ABI } from "@commonwealth/sdk";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { EmptySurface, SurfaceBanner } from "@/components/shared/SurfaceFeedback";
import { useContractAction } from "@/hooks/useContractAction";
import { CONTRACTS, STORACHA_EMAIL, contractsAreConfigured } from "@/lib/contracts";
import { getErrorMessage } from "@/lib/errors";
import { formatEth, formatRelativeTime, truncateAddress } from "@/lib/format";
import { encodeMetadataUri } from "@/lib/metadata";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";
import { hasStorachaUploadSupport, uploadFileToStoracha } from "@/lib/storacha";

function SubmitAttestationCard() {
  const refreshProtocolData = useRefreshProtocolData();
  const submitAttestation = useContractAction(async () => {
    await refreshProtocolData();
    setTitle("");
    setSummary("");
    setEvidence("");
    setReward("");
    setEvidenceFile(null);
    setStorachaAsset(null);
    setUploadStatus(null);
  });
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reward, setReward] = useState("");
  const [storachaEmail, setStorachaEmail] = useState(STORACHA_EMAIL);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [storachaAsset, setStorachaAsset] = useState<{ cid: string; gatewayUrl: string } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUploadEvidence() {
    if (!evidenceFile) {
      setError("Choose a supporting file before uploading.");
      return;
    }

    if (!hasStorachaUploadSupport(storachaEmail)) {
      setError("Provide a storage account email to start uploads.");
      return;
    }

    try {
      setError(null);
      setUploadStatus("Uploading evidence");
      const asset = await uploadFileToStoracha(evidenceFile, storachaEmail);
      setStorachaAsset(asset);
      setUploadStatus(`Evidence uploaded as ${asset.cid}`);
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Unable to upload the evidence file."));
      setUploadStatus(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!contractsAreConfigured()) {
      setError("This action is temporarily unavailable. Retry in a moment.");
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedSummary = summary.trim();
    const normalizedEvidence = evidence.trim();

    if (!normalizedTitle || normalizedTitle.length < 4 || !normalizedSummary || normalizedSummary.length < 12) {
      setError("Add a descriptive title and summary before submitting an attestation.");
      return;
    }

    if (!normalizedEvidence && !storachaAsset) {
      setError("Provide evidence notes or upload a supporting file before submitting.");
      return;
    }

    let parsedReward: bigint;

    try {
      parsedReward = parseEther(reward);
    } catch {
      setError("Requested reward must be a valid positive ETH amount.");
      return;
    }

    if (parsedReward <= 0n) {
      setError("Requested reward must be greater than 0.");
      return;
    }

    setError(null);

    await submitAttestation.execute({
      address: CONTRACTS.impactAttestation,
      abi: IMPACT_ATTESTATION_ABI,
      functionName: "submit",
      args: [
        encodeMetadataUri({
          title: normalizedTitle,
          evidence: normalizedEvidence || "Supporting evidence uploaded.",
          evidenceUrl: storachaAsset?.gatewayUrl,
          storageProvider: storachaAsset ? "storacha" : "inline",
          storachaCid: storachaAsset?.cid,
          createdAt: new Date().toISOString(),
        }),
        encodeMetadataUri({
          title: normalizedTitle,
          summary: normalizedSummary,
          impactArea: "public-goods",
          createdAt: new Date().toISOString(),
        }),
        parsedReward,
      ],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-card border border-border rounded-card p-5 space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-cyan mb-2">Submit work</p>
        <h3 className="font-serif text-2xl text-text-primary">Request a reward for completed work</h3>
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

      <div className="rounded-card border border-border bg-bg-surface p-4 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Evidence archive</p>
            <p className="text-sm text-text-muted">Upload receipts, reports, or media and attach a durable proof link to this reward request.</p>
          </div>
          {uploadStatus ? <span className="font-mono text-xs text-accent-cyan">{uploadStatus}</span> : null}
        </div>

        {!STORACHA_EMAIL ? (
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Storage account email</span>
            <input
              value={storachaEmail}
              onChange={(event) => setStorachaEmail(event.target.value)}
              placeholder="builder@example.com"
              className="w-full rounded-card border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Supporting file</span>
          <input
            type="file"
            onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-card border border-border bg-bg-card px-3 py-2 text-sm text-text-primary"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleUploadEvidence()}
            disabled={!evidenceFile}
            className="font-mono text-xs rounded-full px-4 py-2 border border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10 disabled:opacity-40"
          >
            Upload file
          </button>
          {storachaAsset ? (
            <a
              href={storachaAsset.gatewayUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs rounded-full px-4 py-2 border border-border text-text-primary"
            >
              Open uploaded file
            </a>
          ) : null}
        </div>
      </div>

      {error || submitAttestation.error ? (
        <SurfaceBanner tone="error" title="Attestation submission failed" detail={error ?? submitAttestation.error ?? ""} />
      ) : null}

      <button
        type="submit"
        disabled={submitAttestation.isPending}
        className="font-mono text-xs rounded-full px-4 py-2 bg-accent-cyan text-bg-page disabled:opacity-40"
      >
        {submitAttestation.isPending ? "Submitting" : "Submit for attestation"}
      </button>
    </form>
  );
}

export function AttestationFeed() {
  const { address } = useAccount();
  const { data } = useProtocolData();
  const refreshProtocolData = useRefreshProtocolData();
  const reviewAction = useContractAction(refreshProtocolData);

  return (
    <section id="impact" className="space-y-6">
      {reviewAction.error ? <SurfaceBanner tone="error" title="Review action failed" detail={reviewAction.error} /> : null}

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-cyan mb-2">Impact rewards</p>
        <h2 className="font-serif text-3xl text-text-primary">Show what shipped, collect review, and unlock rewards</h2>
      </div>

      <SubmitAttestationCard />

      <div className="space-y-4">
        {data && data.attestations.length === 0 ? (
          <EmptySurface
            title="No attestations submitted yet"
            detail="Reward requests will appear here as soon as contributors submit completed work for review."
          />
        ) : null}

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
                  {attestation.description?.summary?.toString() ?? "Review details are attached to this reward request."}
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
                <div className="space-y-2">
                  <p className="font-mono text-xs text-text-primary">{attestation.proof?.evidence?.toString() ?? "Encoded metadata attached"}</p>
                  {attestation.proof?.evidenceUrl ? (
                    <a
                      href={attestation.proof.evidenceUrl.toString()}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-accent-cyan"
                    >
                      Open supporting evidence
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {attestation.status === "Pending" && !attestation.hasVoted && (
                <>
                  <button
                    onClick={() =>
                      void reviewAction.execute({
                        address: CONTRACTS.impactAttestation,
                        abi: IMPACT_ATTESTATION_ABI,
                        functionName: "confirm",
                        args: [attestation.id],
                      })
                    }
                    disabled={!contractsAreConfigured() || reviewAction.isPending}
                    className="font-mono text-xs rounded-full px-4 py-2 border border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10 disabled:opacity-40"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() =>
                      void reviewAction.execute({
                        address: CONTRACTS.impactAttestation,
                        abi: IMPACT_ATTESTATION_ABI,
                        functionName: "reject",
                        args: [attestation.id],
                      })
                    }
                    disabled={!contractsAreConfigured() || reviewAction.isPending}
                    className="font-mono text-xs rounded-full px-4 py-2 border border-accent-red/40 text-accent-red bg-accent-red/10 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </>
              )}

              {attestation.status === "Confirmed" && address?.toLowerCase() === attestation.contributor.toLowerCase() && (
                <button
                  onClick={() =>
                    void reviewAction.execute({
                      address: CONTRACTS.impactAttestation,
                      abi: IMPACT_ATTESTATION_ABI,
                      functionName: "claim",
                      args: [attestation.id],
                    })
                  }
                  disabled={!contractsAreConfigured() || reviewAction.isPending}
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
