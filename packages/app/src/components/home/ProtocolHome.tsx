"use client";

import Link from "next/link";
import { formatEth } from "@/lib/format";
import { useProtocolData } from "@/hooks/useProtocolData";
import { isLitProtectedUri } from "@/lib/lit";

const SURFACES = [
  {
    href: "/dashboard",
    label: "Treasury dashboard",
    summary: "See balances, inflows, and where community resources are moving next.",
  },
  {
    href: "/governance",
    label: "Governance",
    summary: "Create funding requests, back priorities, and release treasury capital once support is strong enough.",
  },
  {
    href: "/private-voting",
    label: "Private voting",
    summary: "Run sensitive votes privately while still publishing a shareable public outcome.",
  },
  {
    href: "/impact",
    label: "Impact attestations",
    summary: "Show what shipped, collect review, and claim rewards for completed work.",
  },
  {
    href: "/savings",
    label: "Savings circles",
    summary: "Start rotating savings groups and keep contributions moving on schedule.",
  },
  {
    href: "/depin",
    label: "DePIN marketplace",
    summary: "Publish operational datasets, manage access, and reward verified contributors.",
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
  const pendingReviews = data?.attestations.filter((attestation) => attestation.status === "Pending").length ?? 0;
  const activeCircles = data?.circles.filter((circle) => Number(circle.state) === 1).length ?? 0;
  const verifiedDatasets = data?.submissions.filter((submission) => submission.verified).length ?? 0;
  const protectedDatasets = data?.submissions.filter((submission) => isLitProtectedUri(submission.accessURI)).length ?? 0;

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.35fr,0.95fr] lg:items-end">
        <div className="space-y-5">
          <div className="inline-flex items-center rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-accent-green">
            Community operations in one place
          </div>
          <div className="space-y-4">
            <h2 className="font-serif text-4xl leading-tight text-text-primary sm:text-5xl">
              Run funding, decisions, shared savings, and contributor rewards from a single workspace.
            </h2>
            <p className="max-w-3xl text-base text-text-muted sm:text-lg">
              CommonWealth keeps the work front and center: propose budgets, review completed delivery, protect sensitive votes, coordinate savings groups, and share high-value operational data without bouncing between tools.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/governance"
              className="font-mono text-xs rounded-full px-4 py-2 bg-accent-green text-bg-page"
            >
              Review funding
            </Link>
            <Link
              href="/impact"
              className="font-mono text-xs rounded-full px-4 py-2 border border-border text-text-primary hover:border-border-hover"
            >
              Review completed work
            </Link>
          </div>
        </div>

        <div className="rounded-card border border-border bg-bg-card p-6 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">Today</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Funding requests</p>
              <p className="font-mono text-lg text-text-primary">{data ? data.proposals.length : "..."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Private ballots</p>
              <p className="font-mono text-lg text-text-primary">{data ? privateBallots : "..."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Pending reviews</p>
              <p className="font-mono text-lg text-text-primary">{data ? pendingReviews : "..."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Active circles</p>
              <p className="font-mono text-lg text-text-primary">{data ? activeCircles : "..."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Community treasury</p>
              <p className="font-mono text-lg text-text-primary">
                {data ? `${formatEth(data.balances.convictionTreasury)} ETH` : "..."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Member-only datasets</p>
              <p className="font-mono text-lg text-text-primary">{data ? protectedDatasets : "..."}</p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Verified datasets</p>
              <p className="font-mono text-lg text-text-primary">{data ? verifiedDatasets : "..."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Treasury balance"
          value={data ? `${formatEth(data.balances.convictionTreasury)} ETH` : "Loading"}
          detail="Funds currently available for community-approved work."
        />
        <StatCard
          label="Open reviews"
          value={data ? `${pendingReviews}` : "Loading"}
          detail="Completed work waiting on reviewer confirmation."
        />
        <StatCard
          label="Published datasets"
          value={data ? `${data.submissions.length}` : "Loading"}
          detail="Operational data listings available to the community."
        />
        <StatCard
          label="Private rounds"
          value={data ? `${data.privateProposals.length}` : "Loading"}
          detail="Sensitive votes that can be tallied without exposing individual ballots."
        />
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-cyan mb-2">Workflows</p>
            <h3 className="font-serif text-3xl text-text-primary">Choose where you want to act</h3>
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
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-green">Enter</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-muted">{surface.summary}</p>
              <p className="mt-5 font-mono text-xs text-text-dim group-hover:text-text-primary">Open workspace</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
