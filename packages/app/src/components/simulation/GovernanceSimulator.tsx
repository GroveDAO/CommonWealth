"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function simulateConviction(
  turnout: number,
  whaleConc: number,
  proposalSize: number,
  days: number,
): number[] {
  const alpha = 0.9;
  const baseVotes = turnout * 1000;
  const whaleBoost = whaleConc * 2;
  const sizePenalty = proposalSize / 100;

  const result: number[] = [];
  let c = 0;
  for (let i = 0; i < days; i++) {
    const votes = baseVotes * (1 + whaleBoost / 100) * (1 - sizePenalty * 0.1);
    c = c * alpha + votes * (1 - alpha);
    result.push(Math.round(c * 100) / 100);
  }
  return result;
}

export function GovernanceSimulator() {
  const [turnout, setTurnout] = useState(50);
  const [whaleConc, setWhaleConc] = useState(30);
  const [proposalSize, setProposalSize] = useState(10);

  const chartData = useMemo(() => {
    const values = simulateConviction(turnout, whaleConc, proposalSize, 30);
    return values.map((v, i) => ({ day: i + 1, conviction: v }));
  }, [turnout, whaleConc, proposalSize]);

  const threshold = 1000 * 10; // 10% of assumed 10000 total supply
  const finalConviction = chartData[chartData.length - 1]?.conviction ?? 0;

  const timeToThreshold = useMemo(() => {
    const idx = chartData.findIndex((d) => d.conviction >= threshold);
    return idx === -1 ? ">30 days" : `${idx + 1} days`;
  }, [chartData, threshold]);

  const execProb = useMemo(() => {
    return Math.min(Math.round((finalConviction / threshold) * 100), 100);
  }, [finalConviction, threshold]);

  const whaleCaptureRisk = useMemo(() => {
    return Math.min(Math.round(whaleConc * 1.4), 100);
  }, [whaleConc]);

  function reset() {
    setTurnout(50);
    setWhaleConc(30);
    setProposalSize(10);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-text-primary">Governance Simulator</h2>
        <button
          onClick={reset}
          className="font-mono text-xs border border-border text-text-muted hover:border-border-hover px-4 py-2 rounded transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border">
        {/* Controls */}
        <div className="bg-bg-card p-5 space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                Voter Turnout
              </label>
              <span className="font-mono text-xs text-text-primary">{turnout}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={turnout}
              onChange={(e) => setTurnout(Number(e.target.value))}
              className="w-full accent-accent-green"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                Whale Concentration
              </label>
              <span className="font-mono text-xs text-text-primary">{whaleConc}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={whaleConc}
              onChange={(e) => setWhaleConc(Number(e.target.value))}
              className="w-full accent-accent-yellow"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                Proposal Size (% treasury)
              </label>
              <span className="font-mono text-xs text-text-primary">{proposalSize}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={proposalSize}
              onChange={(e) => setProposalSize(Number(e.target.value))}
              className="w-full accent-accent-purple"
            />
          </div>

          {/* Derived metrics */}
          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                Time to threshold
              </span>
              <span className="font-mono text-sm text-accent-green">{timeToThreshold}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                Execution probability
              </span>
              <span
                className={`font-mono text-sm ${execProb >= 80 ? "text-accent-green" : execProb >= 50 ? "text-accent-yellow" : "text-accent-red"}`}
              >
                {execProb}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                Whale capture risk
              </span>
              <span
                className={`font-mono text-sm ${whaleCaptureRisk >= 60 ? "text-accent-red" : whaleCaptureRisk >= 30 ? "text-accent-yellow" : "text-accent-green"}`}
              >
                {whaleCaptureRisk}%
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim mb-4">
            Conviction curve — 30 simulated days
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2A" />
              <XAxis dataKey="day" tick={{ fill: "#5A5A54", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#5A5A54", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#111110", border: "1px solid #2E2E2A", borderRadius: 4 }}
                labelStyle={{ color: "#8A8880" }}
                itemStyle={{ color: "#C8F060" }}
                formatter={(v: number) => [Math.round(v).toLocaleString(), "Conviction"]}
              />
              <Line
                type="monotone"
                dataKey="conviction"
                stroke="#C8F060"
                strokeWidth={2}
                dot={false}
              />
              {/* Threshold reference line */}
              <Line
                data={chartData.map((d) => ({ ...d, threshold }))}
                type="monotone"
                dataKey="threshold"
                stroke="#F0C040"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                name="Threshold"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
