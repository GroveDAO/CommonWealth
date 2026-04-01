"use client";

import { useEffect, useState } from "react";
import { DEPIN_REGISTRY_ABI, DataType } from "@commonwealth/sdk";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { encodeMetadataUri } from "@/lib/metadata";
import { useRefreshProtocolData } from "@/hooks/useProtocolData";

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
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [region, setRegion] = useState("");
  const [accessUri, setAccessUri] = useState("");
  const [dataType, setDataType] = useState<DataType>(DataType.Environmental);

  useEffect(() => {
    if (isSuccess) {
      void refreshProtocolData();
      onClose();
    }
  }, [isSuccess, onClose, refreshProtocolData]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    writeContract({
      address: CONTRACTS.depinRegistry,
      abi: DEPIN_REGISTRY_ABI,
      functionName: "submit",
      args: [
        encodeMetadataUri({
          title,
          summary,
          region,
          createdAt: new Date().toISOString(),
        }),
        accessUri,
        dataType,
      ],
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-page/75 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-card border border-border bg-bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-yellow mb-2">Data submission</p>
            <h3 className="font-serif text-2xl text-text-primary">Register a DePIN contribution</h3>
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
              className="font-mono text-xs rounded-full px-4 py-2 bg-accent-yellow text-bg-page disabled:opacity-40"
            >
              {isPending ? "Submitting" : "Submit dataset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
