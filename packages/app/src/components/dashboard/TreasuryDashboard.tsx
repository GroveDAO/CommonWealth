"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const grantData = MONTHS.map((month, i) => ({
  month,
  granted: Math.round(12000 + Math.random() * 8000 + i * 1500),
  delivered: Math.round(10000 + Math.random() * 6000 + i * 1200),
}));

const allocationData = [
  { name: "Governance", value: 35, color: "#C8F060" },
  { name: "Impact Fund", value: 28, color: "#60D8C8" },
  { name: "Savings", value: 20, color: "#A080F8" },
  { name: "DePIN", value: 17, color: "#F0C040" },
];

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

function StatCard({ label, value, change, positive }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-border p-5 rounded-card">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim mb-2">{label}</p>
      <p className="font-mono text-2xl text-text-primary mb-1">{value}</p>
      <p className={`font-mono text-xs ${positive ? "text-accent-green" : "text-accent-red"}`}>
        {change}
      </p>
    </div>
  );
}

export function TreasuryDashboard() {
  return (
    <section>
      <h2 className="font-serif text-2xl text-text-primary mb-6">Treasury Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-6">
        <StatCard label="Treasury Balance" value="Ξ 847.32" change="↑ 12.4% this month" positive />
        <StatCard label="Total Granted" value="Ξ 312.08" change="↑ 8.2% vs last month" positive />
        <StatCard label="Active Proposals" value="14" change="↓ 2 from last week" positive={false} />
        <StatCard label="Avg ROI" value="3.24×" change="↑ 0.18 this quarter" positive />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
        {/* Area Chart */}
        <div className="col-span-2 bg-bg-card border border-border p-5 rounded-card">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim mb-4">
            Granted vs Delivered Value (12 months)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={grantData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradGranted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8F060" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#C8F060" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDelivered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60D8C8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#60D8C8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2A" />
              <XAxis dataKey="month" tick={{ fill: "#5A5A54", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#5A5A54", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#111110", border: "1px solid #2E2E2A", borderRadius: 4 }}
                labelStyle={{ color: "#8A8880" }}
                itemStyle={{ color: "#E8E6DC" }}
              />
              <Area
                type="monotone"
                dataKey="granted"
                stroke="#C8F060"
                strokeWidth={2}
                fill="url(#gradGranted)"
                name="Granted"
              />
              <Area
                type="monotone"
                dataKey="delivered"
                stroke="#60D8C8"
                strokeWidth={2}
                fill="url(#gradDelivered)"
                name="Delivered"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-bg-card border border-border p-5 rounded-card">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim mb-4">
            Allocation Breakdown
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: "#8A8880", fontSize: 11 }}>{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{ background: "#111110", border: "1px solid #2E2E2A", borderRadius: 4 }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
