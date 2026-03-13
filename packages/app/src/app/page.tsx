import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { TreasuryDashboard } from "@/components/dashboard/TreasuryDashboard";
import { ProposalList } from "@/components/governance/ProposalList";
import { AttestationFeed } from "@/components/funding/AttestationFeed";
import { SavingsCircleList } from "@/components/savings/SavingsCircleList";
import { DePINMarketplace } from "@/components/depin/DePINMarketplace";

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-16">
        <TreasuryDashboard />
        <ProposalList />
        <AttestationFeed />
        <SavingsCircleList />
        <DePINMarketplace />
      </main>
    </>
  );
}
