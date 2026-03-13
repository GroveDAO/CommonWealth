"use client";

import { usePublicClient, useWalletClient } from "wagmi";
import { useMemo } from "react";
import { ImpactAttestationClient } from "@commonwealth/sdk";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_IMPACT_ATTESTATION_ADDRESS ?? "0x0") as `0x${string}`;

export function useImpactAttestation() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const client = useMemo(() => {
    if (!publicClient) return null;
    return new ImpactAttestationClient(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicClient as any,
      CONTRACT_ADDRESS,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walletClient as any,
    );
  }, [publicClient, walletClient]);

  return { client };
}
