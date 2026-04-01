"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, midnightTheme } from "@rainbow-me/rainbowkit";
import { coinbaseWallet, injectedWallet, safeWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { http } from "wagmi";
import { RPC_URL } from "@/lib/contracts";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID?.trim() ?? "";
const baseWallets = [safeWallet, injectedWallet];
const browserWallets = walletConnectProjectId
  ? [...baseWallets, walletConnectWallet, coinbaseWallet]
  : baseWallets;
const wallets = [
  {
    groupName: "Recommended",
    wallets: typeof window === "undefined" ? baseWallets : browserWallets,
  },
];

const config = getDefaultConfig({
  appName: "CommonWealth",
  appDescription: "Confidential onchain coordination for treasury, attestations, savings circles, and DePIN rewards.",
  projectId: walletConnectProjectId,
  chains: [sepolia],
  wallets,
  ssr: true,
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
});

const theme = midnightTheme({
  accentColor: "#C8F060",
  accentColorForeground: "#0B0D06",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            gcTime: 120_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact" theme={theme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
