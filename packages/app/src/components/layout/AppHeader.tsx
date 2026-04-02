"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount } from "wagmi";
import { COMMONWEALTH_TOKEN_ABI } from "@commonwealth/sdk";
import { CONTRACTS, contractsAreConfigured } from "@/lib/contracts";
import { useContractAction } from "@/hooks/useContractAction";
import { formatToken } from "@/lib/format";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";
import { IconMark } from "@/components/layout/IconMark";
import { SurfaceBanner } from "@/components/shared/SurfaceFeedback";

export function AppHeader() {
  const { address, isConnected } = useAccount();
  const { data } = useProtocolData();
  const refreshProtocolData = useRefreshProtocolData();
  const faucetClaim = useContractAction(refreshProtocolData);

  const wallet = data?.wallet;
  const pendingReviews = data?.attestations.filter((attestation) => attestation.status === "Pending").length ?? 0;
  const activeCircles = data?.circles.filter((circle) => Number(circle.state) === 1).length ?? 0;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const canClaim =
    wallet !== null &&
    wallet !== undefined &&
    (wallet.lastClaimAt === 0n || now >= wallet.lastClaimAt + wallet.faucetCooldown);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-page/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Link href="/" className="flex items-center gap-3 w-fit">
              <IconMark className="h-11 w-11 shrink-0" />
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-green">Collective action workspace</p>
                <h1 className="font-serif text-2xl text-text-primary">CommonWealth</h1>
                <p className="font-sans text-sm text-text-muted max-w-3xl">
                  Coordinate funding, private decisions, shared savings, and contributor rewards from one focused workspace.
                </p>
              </div>
            </Link>
            <div className="flex flex-wrap gap-2">
              <div className="font-mono text-xs text-text-muted border border-border rounded-full px-3 py-1.5 bg-bg-card">
                Funding {data ? `${Number(data.proposals.length).toLocaleString()} requests` : "loading"}
              </div>
              <div className="font-mono text-xs text-text-muted border border-border rounded-full px-3 py-1.5 bg-bg-card">
                Reviews {data ? `${pendingReviews.toLocaleString()} pending` : "loading"}
              </div>
              <div className="font-mono text-xs text-text-muted border border-border rounded-full px-3 py-1.5 bg-bg-card">
                Savings {data ? `${activeCircles.toLocaleString()} active circles` : "loading"}
              </div>
              <div className="font-mono text-xs text-text-muted border border-border rounded-full px-3 py-1.5 bg-bg-card">
                Data {data ? `${Number(data.submissions.length).toLocaleString()} listings` : "loading"}
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
                    void faucetClaim.execute({
                      address: CONTRACTS.token,
                      abi: COMMONWEALTH_TOKEN_ABI,
                      functionName: "claimFaucet",
                    })
                  }
                  disabled={!contractsAreConfigured() || !canClaim || faucetClaim.isPending}
                  className="font-mono text-xs rounded-full px-3 py-1.5 border border-accent-green/40 text-accent-green bg-accent-green/10 hover:bg-accent-green/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {faucetClaim.isPending
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

        {!contractsAreConfigured() ? (
          <SurfaceBanner
            tone="warning"
            title="Workspace unavailable"
            detail="A required service is missing. Refresh in a moment or check the deployment configuration."
          />
        ) : null}

        {faucetClaim.error ? (
          <SurfaceBanner tone="error" title="Faucet request failed" detail={faucetClaim.error} />
        ) : null}
      </div>
    </header>
  );
}
