"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { SAVINGS_CIRCLE_ABI } from "@commonwealth/sdk";
import { CreateCircleModal } from "./CreateCircleModal";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_SAVINGS_CIRCLE_ADDRESS ?? "0x0") as `0x${string}`;

interface MockCircle {
  id: number;
  name: string;
  maxMembers: number;
  currentMembers: number;
  contribution: number;
  token: string;
  cycleFrequency: string;
  state: "Open" | "Active" | "Completed";
  nextPayout: string;
  myQueuePosition?: number;
}

const MOCK_CIRCLES: MockCircle[] = [
  {
    id: 1,
    name: "DePIN Builders Circle",
    maxMembers: 10,
    currentMembers: 7,
    contribution: 100,
    token: "USDC",
    cycleFrequency: "Monthly",
    state: "Open",
    nextPayout: "2026-04-01",
  },
  {
    id: 2,
    name: "Protocol Contributors",
    maxMembers: 5,
    currentMembers: 5,
    contribution: 500,
    token: "DAI",
    cycleFrequency: "Weekly",
    state: "Active",
    nextPayout: "2026-03-18",
    myQueuePosition: 3,
  },
  {
    id: 3,
    name: "Early Builders Fund",
    maxMembers: 8,
    currentMembers: 8,
    contribution: 200,
    token: "USDC",
    cycleFrequency: "Monthly",
    state: "Completed",
    nextPayout: "—",
  },
  {
    id: 4,
    name: "DAO Operations",
    maxMembers: 6,
    currentMembers: 2,
    contribution: 1000,
    token: "DAI",
    cycleFrequency: "Monthly",
    state: "Open",
    nextPayout: "TBD",
  },
];

const STATE_STYLES: Record<string, string> = {
  Open: "text-accent-green bg-accent-green/10",
  Active: "text-accent-cyan bg-accent-cyan/10",
  Completed: "text-text-dim bg-bg-surface",
};

export function SavingsCircleList() {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [showCreate, setShowCreate] = useState(false);

  function handleJoin(id: number) {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "join",
      args: [BigInt(id)],
    });
  }

  function handleContribute(id: number) {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: SAVINGS_CIRCLE_ABI,
      functionName: "contribute",
      args: [BigInt(id)],
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-text-primary">Savings Circles</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="font-mono text-xs bg-accent-purple text-bg-page px-4 py-2 rounded font-medium hover:bg-accent-purple/90 transition-colors"
        >
          + Create Circle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
        {MOCK_CIRCLES.map((circle) => (
          <div key={circle.id} className="bg-bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sans text-sm font-medium text-text-primary">{circle.name}</h3>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${STATE_STYLES[circle.state]}`}>
                {circle.state}
              </span>
            </div>

            {/* Member fill bar */}
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[10px] text-text-dim">Members</span>
                <span className="font-mono text-[10px] text-text-muted">
                  {circle.currentMembers}/{circle.maxMembers}
                </span>
              </div>
              <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-purple rounded-full"
                  style={{
                    width: `${Math.round((circle.currentMembers / circle.maxMembers) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="font-mono text-[10px] text-text-dim mb-0.5">Contribution</p>
                <p className="font-mono text-sm text-text-primary">
                  {circle.contribution.toLocaleString()} {circle.token}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-text-dim mb-0.5">Frequency</p>
                <p className="font-mono text-sm text-text-muted">{circle.cycleFrequency}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-mono text-[10px] text-text-dim mb-0.5">Next Payout</p>
                <p className="font-mono text-xs text-text-muted">{circle.nextPayout}</p>
              </div>
              {circle.myQueuePosition !== undefined && (
                <div className="text-right">
                  <p className="font-mono text-[10px] text-text-dim mb-0.5">My Position</p>
                  <p className="font-mono text-xs text-accent-purple">#{circle.myQueuePosition}</p>
                </div>
              )}
            </div>

            {circle.state === "Open" && (
              <button
                onClick={() => handleJoin(circle.id)}
                disabled={!isConnected || isPending}
                className="w-full font-mono text-xs bg-accent-purple/20 border border-accent-purple/40 text-accent-purple px-4 py-2 rounded hover:bg-accent-purple/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Join Circle
              </button>
            )}
            {circle.state === "Active" && (
              <button
                onClick={() => handleContribute(circle.id)}
                disabled={!isConnected || isPending}
                className="w-full font-mono text-xs bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan px-4 py-2 rounded hover:bg-accent-cyan/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Contribute this cycle
              </button>
            )}
            {circle.state === "Completed" && (
              <button
                disabled
                className="w-full font-mono text-xs border border-border text-text-dim px-4 py-2 rounded cursor-not-allowed opacity-40"
              >
                Completed
              </button>
            )}
          </div>
        ))}
      </div>

      {showCreate && <CreateCircleModal onClose={() => setShowCreate(false)} />}
    </section>
  );
}
