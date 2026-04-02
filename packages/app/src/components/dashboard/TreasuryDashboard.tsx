"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEther, formatUnits } from "viem";
import { formatEth, formatToken } from "@/lib/format";
import { useProtocolData } from "@/hooks/useProtocolData";
import { EmptySurface } from "@/components/shared/SurfaceFeedback";

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">{label}</p>
      <p className="font-mono text-2xl text-text-primary mb-1">{value}</p>
      <p className="font-sans text-sm text-text-muted">{detail}</p>
    </div>
  );
}

export function TreasuryDashboard() {
  const { data, isLoading } = useProtocolData();

  const allocationData = data
    ? [
        { name: "Treasury ETH", value: Number(formatEther(data.balances.convictionTreasury)), color: "#C8F060" },
        { name: "Impact ETH", value: Number(formatEther(data.balances.impactTreasury)), color: "#60D8C8" },
        { name: "Savings escrow", value: Number(formatUnits(data.balances.savingsEscrow, 18)), color: "#A080F8" },
        { name: "DePIN rewards", value: Number(formatUnits(data.balances.depinRewardPool, 18)), color: "#F0C040" },
      ].filter((entry) => entry.value > 0)
    : [];

  const convictionData = data
    ? data.proposals.map((proposal) => ({
        name: `#${proposal.id.toString()}`,
        progress: Number((proposal.currentConviction * 100n) / (proposal.threshold === 0n ? 1n : proposal.threshold)),
      }))
    : [];

  return (
    <section id="dashboard" className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-green mb-2">Treasury overview</p>
          <h2 className="font-serif text-3xl text-text-primary">Resource health and funding momentum</h2>
        </div>
        <div className="font-mono text-xs text-text-muted border border-border rounded-full px-3 py-1.5 bg-bg-card">
          {isLoading ? "Refreshing" : "Current snapshot"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Treasury Balance"
          value={data ? `${formatEth(data.balances.convictionTreasury)} ETH` : "0 ETH"}
          detail="Available now for approved community work"
        />
        <StatCard
          label="Distributed Rewards"
          value={data ? formatToken(data.balances.distributedRewards) : "0"}
          detail="Rewards already paid out to contributors"
        />
        <StatCard
          label="Active Circles"
          value={data ? `${data.circles.filter((circle) => Number(circle.state) === 1).length}` : "0"}
          detail="Savings groups currently in rotation"
        />
        <StatCard
          label="Private Ballots"
          value={data ? `${data.privateProposals.reduce((total, proposal) => total + Number(proposal.ballotCount), 0)}` : "0"}
          detail="Ballots cast across confidential decision rounds"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr,1fr] gap-4">
        <div className="bg-bg-card border border-border rounded-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-4">
            Proposal conviction progress
          </p>
          {convictionData.length === 0 ? (
            <EmptySurface
              title="No conviction history yet"
              detail="Funding momentum will appear here once members start backing requests."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={convictionData}>
                <XAxis dataKey="name" tick={{ fill: "#8A8880", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8A8880", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#111110", border: "1px solid #2E2E2A", borderRadius: 6 }}
                  formatter={(value: number) => [`${Math.min(value, 999).toFixed(0)}%`, "Threshold progress"]}
                />
                <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                  {convictionData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={index % 3 === 0 ? "#C8F060" : index % 3 === 1 ? "#60D8C8" : "#A080F8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-bg-card border border-border rounded-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-4">
            Balance distribution
          </p>
          {allocationData.length === 0 ? (
            <EmptySurface
              title="No treasury balances indexed"
              detail="Balance composition will appear as soon as each treasury pool is loaded."
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={allocationData} dataKey="value" cx="50%" cy="50%" innerRadius={58} outerRadius={92}>
                    {allocationData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111110", border: "1px solid #2E2E2A", borderRadius: 6 }}
                    formatter={(value: number) => [value.toLocaleString(undefined, { maximumFractionDigits: 2 }), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {allocationData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-mono text-xs text-text-muted">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
