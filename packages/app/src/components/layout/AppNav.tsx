"use client";

import { useState } from "react";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "governance", label: "Governance" },
  { id: "impact", label: "Fund Impact" },
  { id: "savings", label: "Savings" },
  { id: "depin", label: "DePIN" },
  { id: "simulate", label: "Simulate" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AppNav() {
  const [active, setActive] = useState<TabId>("dashboard");

  return (
    <nav className="border-b border-border bg-bg-page">
      <div className="max-w-7xl mx-auto px-6">
        <ul className="flex items-center gap-0">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => setActive(tab.id)}
                className={[
                  "font-sans text-sm px-4 py-3 transition-colors border-b-2",
                  active === tab.id
                    ? "border-accent-green text-accent-green"
                    : "border-transparent text-text-dim hover:text-text-muted",
                ].join(" ")}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
