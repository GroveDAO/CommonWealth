"use client";

import { useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { COMMONWEALTH_TOKEN_ABI } from "@commonwealth/sdk";
import { CONTRACTS } from "@/lib/contracts";
import { formatToken } from "@/lib/format";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";
import { IconMark } from "@/components/layout/IconMark";

export function AppHeader() {
  const { address, isConnected } = useAccount();
  const { data } = useProtocolData();
  const refreshProtocolData = useRefreshProtocolData();
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      void refreshProtocolData();
    }
  }, [isConfirmed, refreshProtocolData]);

  const wallet = data?.wallet;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const canClaim =
    wallet !== null &&
    wallet !== undefined &&
    (wallet.lastClaimAt === 0n || now >= wallet.lastClaimAt + wallet.faucetCooldown);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-page/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <IconMark className="h-11 w-11 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl text-text-primary">CommonWealth</h1>
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-green border border-accent-green/30 bg-accent-green/10 px-2 py-1 rounded-full">
                  Public Beta Live
                </span>
              </div>
              {/* <p className="font-sans text-sm text-text-muted max-w-2xl">
                Confidential treasury coordination, attestation funding, rotating savings, DePIN rewards, and Zama-powered private conviction voting.
              </p> */}
            </div>
          </Link>
          <div className="flex flex-wrap gap-2">
            <div className="font-mono text-xs text-text-muted border border-border rounded-full px-3 py-1.5 bg-bg-card">
              Treasury {data ? `${Number(data.proposals.length).toLocaleString()} proposals` : "loading"}
            </div>
            <div className="font-mono text-xs text-text-muted border border-border rounded-full px-3 py-1.5 bg-bg-card">
              Impact {data ? `${Number(data.attestations.length).toLocaleString()} attestations` : "loading"}
            </div>
            <div className="font-mono text-xs text-text-muted border border-border rounded-full px-3 py-1.5 bg-bg-card">
              Private ballots {data ? `${data.privateProposals.reduce((total, proposal) => total + Number(proposal.ballotCount), 0)}` : "loading"}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          {isConnected && wallet && address && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-mono text-xs bg-bg-card border border-border rounded-full px-3 py-1.5 text-text-primary">
                {formatToken(wallet.tokenBalance)} CWT
              </div>
              <button
                onClick={() =>
                  writeContract({
                    address: CONTRACTS.token,
                    abi: COMMONWEALTH_TOKEN_ABI,
                    functionName: "claimFaucet",
                  })
                }
                disabled={!canClaim || isPending}
                className="font-mono text-xs rounded-full px-3 py-1.5 border border-accent-green/40 text-accent-green bg-accent-green/10 hover:bg-accent-green/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending
                  ? "Claiming"
                  : canClaim
                    ? `Claim ${formatToken(wallet.faucetAmount, 18, 0)} CWT`
                    : "Faucet cooling down"}
              </button>
            </div>
          )}

          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
