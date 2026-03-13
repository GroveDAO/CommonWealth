"use client";

import { useState } from "react";
import { BarChart, Bar, ResponsiveContainer } from "recharts";

interface Delegate {
  address: string;
  initials: string;
  specialisations: string[];
  apy: number;
  totalDelegated: number;
  history: number[];
}

const DELEGATES: Delegate[] = [
  {
    address: "0xa1b2c3...d4e5f6",
    initials: "AB",
    specialisations: ["DeFi", "Governance"],
    apy: 4.2,
    totalDelegated: 128500,
    history: [40, 60, 80, 55, 70, 90, 75, 85, 65, 78, 92, 88],
  },
  {
    address: "0xf6e5d4...c3b2a1",
    initials: "FE",
    specialisations: ["Infrastructure", "DePIN"],
    apy: 6.1,
    totalDelegated: 94200,
    history: [30, 45, 50, 65, 72, 68, 80, 75, 85, 90, 82, 95],
  },
  {
    address: "0x123abc...456def",
    initials: "CD",
    specialisations: ["Impact", "Public Goods"],
    apy: 3.8,
    totalDelegated: 215000,
    history: [50, 70, 65, 80, 75, 88, 85, 90, 78, 82, 88, 94],
  },
  {
    address: "0xdef456...789abc",
    initials: "GH",
    specialisations: ["DeFi", "Staking"],
    apy: 5.5,
    totalDelegated: 67800,
    history: [25, 38, 45, 52, 60, 58, 70, 65, 72, 80, 76, 85],
  },
  {
    address: "0x789abc...012def",
    initials: "IJ",
    specialisations: ["Governance"],
    apy: 2.9,
    totalDelegated: 312000,
    history: [60, 72, 78, 80, 85, 82, 88, 90, 87, 92, 89, 96],
  },
  {
    address: "0x012def...345ghi",
    initials: "KL",
    specialisations: ["Public Goods", "Research"],
    apy: 4.7,
    totalDelegated: 51400,
    history: [20, 30, 42, 55, 50, 65, 60, 75, 68, 78, 72, 82],
  },
];

const ALL_SPECS = Array.from(new Set(DELEGATES.flatMap((d) => d.specialisations)));

interface HistoryBarProps {
  data: number[];
}

function HistoryBar({ data }: HistoryBarProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="v" fill="#C8F060" radius={[1, 1, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DelegationMarketplace() {
  const [activeSpec, setActiveSpec] = useState<string>("All");

  const filtered =
    activeSpec === "All"
      ? DELEGATES
      : DELEGATES.filter((d) => d.specialisations.includes(activeSpec));

  return (
    <section>
      <h2 className="font-serif text-2xl text-text-primary mb-4">Delegation Marketplace</h2>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["All", ...ALL_SPECS].map((spec) => (
          <button
            key={spec}
            onClick={() => setActiveSpec(spec)}
            className={`font-mono text-xs px-3 py-1 rounded border transition-colors ${
              activeSpec === spec
                ? "bg-accent-green/10 border-accent-green text-accent-green"
                : "border-border text-text-dim hover:border-border-hover"
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
        {filtered.map((delegate) => (
          <div key={delegate.address} className="bg-bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-bg-surface border border-border flex items-center justify-center">
                <span className="font-mono text-xs text-text-muted">{delegate.initials}</span>
              </div>
              <div>
                <p className="font-mono text-xs text-text-primary">{delegate.address}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {delegate.specialisations.map((s) => (
                    <span
                      key={s}
                      className="font-mono text-[9px] text-text-dim bg-bg-surface px-1.5 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-0.5">
                  APY
                </p>
                <p className="font-mono text-sm text-accent-green">{delegate.apy.toFixed(2)}%</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-text-dim uppercase tracking-widest mb-0.5">
                  Delegated
                </p>
                <p className="font-mono text-sm text-text-primary">
                  {delegate.totalDelegated.toLocaleString()}
                </p>
              </div>
            </div>

            <HistoryBar data={delegate.history} />

            <button className="mt-3 w-full font-mono text-xs border border-border text-text-muted hover:border-border-hover hover:text-text-primary px-4 py-2 rounded transition-colors">
              Delegate
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
