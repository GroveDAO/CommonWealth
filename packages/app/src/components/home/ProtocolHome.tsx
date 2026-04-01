"use client";

import Link from "next/link";
import { formatEth } from "@/lib/format";
import { useProtocolData } from "@/hooks/useProtocolData";

const SURFACES = [
  {
    href: "/dashboard",
    label: "Treasury dashboard",
    summary: "Track live treasury balances, reward pools, conviction thresholds, and protocol-wide allocation mix.",
  },
  {
    href: "/governance",
    label: "Governance",
    summary: "Create grant proposals, stake conviction, and execute treasury decisions against the Sepolia deployment.",
  },
  {
    href: "/private-voting",
    label: "Private voting",
    summary: "Use Zama FHE ballots to express confidential support or opposition while keeping public tally proofs onchain.",
  },
  {
    href: "/impact",
    label: "Impact attestations",
    summary: "Submit evidence-backed work claims, collect attester confirmations, and draw rewards from the funding treasury.",
  },
  {
    href: "/savings",
    label: "Savings circles",
    summary: "Launch and manage rotating savings groups with live contribution state and recipient sequencing.",
  },
  {
    href: "/depin",
    label: "DePIN marketplace",
    summary: "Publish infrastructure datasets, verify quality, and claim token rewards from the onchain registry.",
  },
] as const;

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-card border border-border bg-bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">{label}</p>
      <p className="font-mono text-2xl text-text-primary mb-1">{value}</p>
      <p className="text-sm text-text-muted">{detail}</p>
    </div>
  );
}

export function ProtocolHome() {
  const { data } = useProtocolData();

  const privateBallots = data?.privateProposals.reduce((total, proposal) => total + Number(proposal.ballotCount), 0) ?? 0;

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.35fr,0.95fr] lg:items-end">
        <div className="space-y-5">
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-green">Live protocol</span>
          </div> */}
          <div className="space-y-4">
            <h2 className="font-serif text-4xl leading-tight text-text-primary sm:text-5xl">
              Confidential treasury coordination, attestation funding, rotating savings, DePIN rewards, and Zama-powered private conviction voting.
            </h2>
            {/* <p className="max-w-3xl text-base text-text-muted sm:text-lg">
              CommonWealth now opens into dedicated pages for treasury coordination, public governance, Zama-powered
              private conviction voting, impact attestations, savings circles, and DePIN rewards. Each route is wired
              to the real Sepolia contracts deployed for this repo.
            </p> */}
          </div>
        </div>

        <div className="rounded-card border border-border bg-bg-card p-6 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">Deployment snapshot</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Treasury proposals</p>
              <p className="font-mono text-lg text-text-primary">{data ? data.proposals.length : "..."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Private ballots</p>
              <p className="font-mono text-lg text-text-primary">{data ? privateBallots : "..."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Impact treasury</p>
              <p className="font-mono text-lg text-text-primary">
                {data ? `${formatEth(data.balances.impactTreasury)} ETH` : "..."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Active circles</p>
              <p className="font-mono text-lg text-text-primary">
                {data ? data.circles.filter((circle) => Number(circle.state) === 1).length : "..."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Treasury ETH"
          value={data ? `${formatEth(data.balances.convictionTreasury)} ETH` : "Loading"}
          detail="Available for grant execution through conviction voting."
        />
        <StatCard
          label="Impact Claims"
          value={data ? `${data.attestations.length}` : "Loading"}
          detail="Evidence-backed reward requests awaiting or passing review."
        />
        <StatCard
          label="DePIN Entries"
          value={data ? `${data.submissions.length}` : "Loading"}
          detail="Live registry submissions visible to the dashboard marketplace."
        />
        <StatCard
          label="Encrypted Rounds"
          value={data ? `${data.privateProposals.length}` : "Loading"}
          detail="Private conviction votes secured with Zama FHE primitives."
        />
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-cyan mb-2">Route map</p>
            <h3 className="font-serif text-3xl text-text-primary">Features</h3>
          </div>
          <div className="font-mono text-xs text-text-muted rounded-full border border-border bg-bg-card px-3 py-1.5">
            App Router structure
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {SURFACES.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              className="group rounded-card border border-border bg-bg-card p-5 transition-colors hover:border-accent-green/40 hover:bg-bg-surface"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-serif text-2xl text-text-primary">{surface.label}</p>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-green">Open</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-muted">{surface.summary}</p>
              <p className="mt-5 font-mono text-xs text-text-dim group-hover:text-text-primary">{surface.href}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
