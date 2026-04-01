"use client";

import { useEffect, useState } from "react";
import { COMMONWEALTH_TOKEN_ABI, SAVINGS_CIRCLE_ABI } from "@commonwealth/sdk";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { formatDuration, formatToken, truncateAddress } from "@/lib/format";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";
import { CreateCircleModal } from "./CreateCircleModal";

export function SavingsCircleList() {
  const { address, isConnected } = useAccount();
  const { data } = useProtocolData();
  const refreshProtocolData = useRefreshProtocolData();
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      void refreshProtocolData();
    }
  }, [isSuccess, refreshProtocolData]);

  const allowance = data?.wallet?.savingsAllowance ?? 0n;

  return (
    <section id="savings" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-purple mb-2">Savings circles</p>
          <h2 className="font-serif text-3xl text-text-primary">Rotating contributions backed by live token escrow</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="font-mono text-xs rounded-full px-4 py-2 bg-accent-purple text-bg-page w-fit"
        >
          Create circle
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {data?.circles.map((circle) => {
          const isCreator = address?.toLowerCase() === circle.creator.toLowerCase();
          const isFull = circle.memberCount >= circle.maxMembers;
          const isOpen = Number(circle.state) === 0;
          const isActive = Number(circle.state) === 1;
          const canContribute = allowance >= circle.contribution;

          return (
            <article key={circle.id.toString()} className="bg-bg-card border border-border rounded-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-2xl text-text-primary">{circle.name}</h3>
                  <p className="font-mono text-xs text-text-dim mt-1">Created by {truncateAddress(circle.creator)}</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] rounded-full px-2 py-1 border border-border bg-bg-surface text-text-muted">
                  {Number(circle.state) === 0 ? "Open" : Number(circle.state) === 1 ? "Active" : "Completed"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Contribution</p>
                  <p className="font-mono text-lg text-text-primary">{formatToken(circle.contribution)} CWT</p>
                </div>
                <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Cadence</p>
                  <p className="font-mono text-lg text-text-primary">{formatDuration(circle.cycleDuration)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">Members</span>
                  <span className="font-mono text-xs text-text-primary">
                    {circle.memberCount.toString()} / {circle.maxMembers.toString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-purple"
                    style={{
                      width: `${Number((circle.memberCount * 100n) / (circle.maxMembers === 0n ? 1n : circle.maxMembers))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Current recipient</p>
                <p className="font-mono text-sm text-text-primary">
                  {circle.currentRecipient === "0x0000000000000000000000000000000000000000"
                    ? "Pending start"
                    : truncateAddress(circle.currentRecipient)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOpen && !isFull && (
                  <button
                    onClick={() =>
                      writeContract({
                        address: CONTRACTS.savingsCircle,
                        abi: SAVINGS_CIRCLE_ABI,
                        functionName: "join",
                        args: [circle.id],
                      })
                    }
                    disabled={!isConnected || isPending}
                    className="font-mono text-xs rounded-full px-4 py-2 border border-accent-purple/40 text-accent-purple bg-accent-purple/10 disabled:opacity-40"
                  >
                    Join circle
                  </button>
                )}

                {isOpen && isCreator && isFull && (
                  <button
                    onClick={() =>
                      writeContract({
                        address: CONTRACTS.savingsCircle,
                        abi: SAVINGS_CIRCLE_ABI,
                        functionName: "start",
                        args: [circle.id],
                      })
                    }
                    disabled={isPending}
                    className="font-mono text-xs rounded-full px-4 py-2 border border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10 disabled:opacity-40"
                  >
                    Start rotation
                  </button>
                )}

                {isActive && (
                  <button
                    onClick={() =>
                      writeContract({
                        address: CONTRACTS.token,
                        abi: COMMONWEALTH_TOKEN_ABI,
                        functionName: canContribute ? "approve" : "approve",
                        args: [CONTRACTS.savingsCircle, circle.contribution * 10n],
                      })
                    }
                    disabled={!isConnected || isPending || canContribute}
                    className="font-mono text-xs rounded-full px-4 py-2 border border-border text-text-primary disabled:opacity-40"
                  >
                    Approve CWT
                  </button>
                )}

                {isActive && (
                  <button
                    onClick={() =>
                      writeContract({
                        address: CONTRACTS.savingsCircle,
                        abi: SAVINGS_CIRCLE_ABI,
                        functionName: "contribute",
                        args: [circle.id],
                      })
                    }
                    disabled={!isConnected || isPending || !canContribute}
                    className="font-mono text-xs rounded-full px-4 py-2 bg-accent-purple text-bg-page disabled:opacity-40"
                  >
                    Contribute cycle
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {showCreate && <CreateCircleModal onClose={() => setShowCreate(false)} />}
    </section>
  );
}
