"use client";

import { usePublicClient, useWalletClient } from "wagmi";
import { useMemo } from "react";
import { SavingsCircleClient } from "@commonwealth/sdk";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_SAVINGS_CIRCLE_ADDRESS ?? "0x0") as `0x${string}`;

export function useSavingsCircle() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const client = useMemo(() => {
    if (!publicClient) return null;
    return new SavingsCircleClient(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicClient as any,
      CONTRACT_ADDRESS,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walletClient as any,
    );
  }, [publicClient, walletClient]);

  return { client };
}
