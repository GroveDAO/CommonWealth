import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { Web3Provider } from "@/providers/Web3Provider";

export const metadata: Metadata = {
  title: {
    default: "CommonWealth — Programmable Collective Action",
    template: "%s | CommonWealth",
  },
  description:
    "A collective action workspace for funding decisions, private votes, contributor rewards, shared savings, and operational data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg-page text-text-primary font-sans antialiased">
        <Web3Provider>
          <AppHeader />
          <AppNav />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
