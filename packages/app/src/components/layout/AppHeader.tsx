"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function AppHeader() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-page/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl text-text-primary">Common</span>
          <span className="font-serif text-xl text-accent-green">Wealth</span>
          <span className="font-mono text-[10px] text-text-dim bg-bg-surface border border-border px-1.5 py-0.5 rounded">
            v1.0
          </span>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <>
              <span className="font-mono text-sm text-text-muted bg-bg-surface border border-border px-3 py-1.5 rounded">
                {truncateAddress(address)}
              </span>
              <button
                onClick={() => disconnect()}
                className="font-mono text-xs text-text-dim hover:text-accent-red border border-border hover:border-accent-red px-3 py-1.5 rounded transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="font-mono text-xs text-bg-page bg-accent-green hover:bg-accent-green/90 px-4 py-1.5 rounded font-medium transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
