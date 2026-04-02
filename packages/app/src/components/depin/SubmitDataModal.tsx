"use client";

import { useEffect, useState } from "react";
import { DEPIN_REGISTRY_ABI, DataType } from "@commonwealth/sdk";
import { SurfaceBanner } from "@/components/shared/SurfaceFeedback";
import { useContractAction } from "@/hooks/useContractAction";
import { CONTRACTS, STORACHA_EMAIL, contractsAreConfigured } from "@/lib/contracts";
import { getErrorMessage } from "@/lib/errors";
import { encryptDatasetAccessUri, isLitProtectedUri } from "@/lib/lit";
import { encodeMetadataUri } from "@/lib/metadata";
import { useRefreshProtocolData } from "@/hooks/useProtocolData";
import { hasStorachaUploadSupport, uploadFileToStoracha } from "@/lib/storacha";

interface SubmitDataModalProps {
  onClose: () => void;
}

const DATA_TYPES = [
  { label: "Environmental", value: DataType.Environmental },
  { label: "Infrastructure", value: DataType.Infrastructure },
  { label: "Compute", value: DataType.Compute },
  { label: "Storage", value: DataType.Storage },
  { label: "Bandwidth", value: DataType.Bandwidth },
];

export function SubmitDataModal({ onClose }: SubmitDataModalProps) {
  const refreshProtocolData = useRefreshProtocolData();
  const submitData = useContractAction(async () => {
    await refreshProtocolData();
    onClose();
  });

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [region, setRegion] = useState("");
  const [accessUri, setAccessUri] = useState("");
  const [dataType, setDataType] = useState<DataType>(DataType.Environmental);
  const [encryptWithLit, setEncryptWithLit] = useState(true);
  const [storachaEmail, setStorachaEmail] = useState(STORACHA_EMAIL);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [storachaAsset, setStorachaAsset] = useState<{ cid: string; gatewayUrl: string } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUploadDataset() {
    if (!datasetFile) {
      setError("Choose a dataset file before uploading.");
      return;
    }

    if (!hasStorachaUploadSupport(storachaEmail)) {
      setError("Provide a storage account email to start uploads.");
      return;
    }

    try {
      setError(null);
      setUploadStatus("Uploading dataset");
      const asset = await uploadFileToStoracha(datasetFile, storachaEmail);
      setStorachaAsset(asset);
      setAccessUri(asset.gatewayUrl);
      setUploadStatus(`Dataset uploaded as ${asset.cid}`);
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Unable to upload the dataset file."));
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
    const normalizedRegion = region.trim();
    const normalizedAccessUri = accessUri.trim();

    if (!normalizedTitle || normalizedTitle.length < 4 || !normalizedSummary || normalizedSummary.length < 12 || !normalizedRegion) {
      setError("Provide a descriptive dataset title, summary, and region before submitting.");
      return;
    }

    if (!normalizedAccessUri) {
      setError("Add a dataset access URL or upload a file before submitting.");
      return;
    }

    try {
      setError(null);
      const finalAccessUri = encryptWithLit && !isLitProtectedUri(normalizedAccessUri)
        ? await encryptDatasetAccessUri(normalizedAccessUri, CONTRACTS.token)
        : normalizedAccessUri;

      await submitData.execute({
        address: CONTRACTS.depinRegistry,
        abi: DEPIN_REGISTRY_ABI,
        functionName: "submit",
        args: [
          encodeMetadataUri({
            title: normalizedTitle,
            summary: normalizedSummary,
            region: normalizedRegion,
            storageProvider: storachaAsset ? "storacha" : "external",
            storachaCid: storachaAsset?.cid,
            accessModel: encryptWithLit ? "lit-gated" : "public",
            encryptedAccess: encryptWithLit,
            createdAt: new Date().toISOString(),
          }),
          finalAccessUri,
          dataType,
        ],
      });
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Unable to submit the dataset."));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-page/75 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-card border border-border bg-bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-yellow mb-2">Data submission</p>
            <h3 className="font-serif text-2xl text-text-primary">Publish a dataset listing</h3>
          </div>
          <button onClick={onClose} className="font-mono text-sm text-text-muted hover:text-text-primary">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Dataset title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-yellow"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Summary</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={3}
              className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-yellow resize-none"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Region</span>
              <input
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-yellow"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Data type</span>
              <select
                value={dataType}
                onChange={(event) => setDataType(Number(event.target.value) as DataType)}
                className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-yellow"
              >
                {DATA_TYPES.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Access URL</span>
            <input
              value={accessUri}
              onChange={(event) => setAccessUri(event.target.value)}
              className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-yellow"
            />
          </label>

          <div className="rounded-card border border-border bg-bg-surface p-4 space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">File archive</p>
              <p className="text-sm text-text-muted">Upload a raw dataset file and automatically attach the resulting shareable link to this listing.</p>
            </div>

            {!STORACHA_EMAIL ? (
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Storage account email</span>
                <input
                  value={storachaEmail}
                  onChange={(event) => setStorachaEmail(event.target.value)}
                  placeholder="builder@example.com"
                  className="w-full rounded-card border border-border bg-bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-yellow"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim block mb-2">Dataset file</span>
              <input
                type="file"
                onChange={(event) => setDatasetFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-card border border-border bg-bg-card px-3 py-2 text-sm text-text-primary"
              />
            </label>

            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={() => void handleUploadDataset()}
                disabled={!datasetFile}
                className="font-mono text-xs rounded-full px-4 py-2 border border-accent-yellow/40 text-accent-yellow bg-accent-yellow/10 disabled:opacity-40"
              >
                Upload file
              </button>
              {uploadStatus ? <span className="font-mono text-xs text-accent-cyan">{uploadStatus}</span> : null}
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

          <label className="flex items-start gap-3 rounded-card border border-border bg-bg-surface px-4 py-3">
            <input
              type="checkbox"
              checked={encryptWithLit}
              onChange={(event) => setEncryptWithLit(event.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Private access</p>
              <p className="text-sm text-text-muted">Restrict this link to members holding at least 1 CWT. Disable this if you want the dataset to stay fully public.</p>
            </div>
          </label>

          {error || submitData.error ? (
            <SurfaceBanner tone="error" title="Dataset submission failed" detail={error ?? submitData.error ?? ""} />
          ) : null}

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
              disabled={submitData.isPending}
              className="font-mono text-xs rounded-full px-4 py-2 bg-accent-yellow text-bg-page disabled:opacity-40"
            >
              {submitData.isPending ? "Submitting" : "Publish dataset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
