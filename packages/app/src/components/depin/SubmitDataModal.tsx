"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { DEPIN_REGISTRY_ABI, DataType } from "@commonwealth/sdk";
import { useFilecoin } from "@/hooks/useFilecoin";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_DEPIN_REGISTRY_ADDRESS ?? "0x0") as `0x${string}`;

const DATA_TYPE_OPTIONS = [
  { label: "Environmental", value: DataType.Environmental },
  { label: "Infrastructure", value: DataType.Infrastructure },
  { label: "Compute", value: DataType.Compute },
  { label: "Storage", value: DataType.Storage },
  { label: "Bandwidth", value: DataType.Bandwidth },
];

interface SubmitDataModalProps {
  onClose: () => void;
}

export function SubmitDataModal({ onClose }: SubmitDataModalProps) {
  const [description, setDescription] = useState("");
  const [dataType, setDataType] = useState<DataType>(DataType.Environmental);
  const [litCID, setLitCID] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"form" | "uploading" | "submitting" | "done">("form");
  const [error, setError] = useState<string | null>(null);

  const { uploadFile, isUploading } = useFilecoin();
  const { writeContract, isPending } = useWriteContract();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description || !file) {
      setError("Description and file are required.");
      return;
    }

    try {
      setStep("uploading");
      const dataCID = await uploadFile(file);

      setStep("submitting");
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: DEPIN_REGISTRY_ABI,
          functionName: "submit",
          args: [dataCID, litCID || dataCID, dataType],
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
          <h2 className="font-serif text-xl text-text-primary">Submit Data</h2>
          <button onClick={onClose} className="font-mono text-text-dim hover:text-text-muted text-lg">
            ×
          </button>
        </div>

        {step === "done" ? (
          <div className="text-center py-8">
            <p className="font-mono text-accent-green text-sm mb-4">Data submitted!</p>
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
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover resize-none"
                placeholder="Describe your data contribution..."
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Data File (PDF / CSV / JSON)
              </label>
              <input
                type="file"
                accept=".pdf,.csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-xs text-text-primary file:mr-3 file:bg-bg-card file:border file:border-border file:text-text-muted file:rounded file:px-2 file:py-0.5 file:font-mono file:text-xs cursor-pointer"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Data Type
              </label>
              <select
                value={dataType}
                onChange={(e) => setDataType(Number(e.target.value) as DataType)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:border-border-hover"
              >
                {DATA_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim block mb-1">
                Lit Protocol Condition CID (optional)
              </label>
              <input
                value={litCID}
                onChange={(e) => setLitCID(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover"
                placeholder="bafy..."
              />
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
                disabled={isUploading || isPending}
                className="flex-1 font-mono text-xs bg-accent-yellow text-bg-page px-4 py-2 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-yellow/90 transition-colors"
              >
                {step === "uploading"
                  ? "Uploading…"
                  : step === "submitting"
                    ? "Submitting…"
                    : "Submit Data"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
