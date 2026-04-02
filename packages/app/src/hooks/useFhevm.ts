"use client";

import { useEffect, useState } from "react";
import { RPC_URL } from "@/lib/contracts";

type FhevmInstance = {
  createEncryptedInput: (contractAddress: string, userAddress: string) => {
    add64: (value: bigint) => void;
    addBool: (value: boolean) => void;
    generateZKProof: () => unknown;
  };
  requestZKProofVerification: (proof: unknown) => Promise<{
    handles: Uint8Array[];
    inputProof: Uint8Array;
  }>;
  publicDecrypt: (handles: string[]) => Promise<{
    clearValues: Record<string, bigint | number | string>;
    decryptionProof: `0x${string}`;
  }>;
  generateKeypair: () => {
    publicKey: string;
    privateKey: string;
  };
  createEIP712: (publicKey: string, contractAddresses: string[], startTimestamp: number, durationDays: number) => {
    domain: Record<string, unknown>;
    message: Record<string, unknown>;
    primaryType: string;
    types: Record<string, Array<Record<string, string>>>;
  };
  userDecrypt: (
    pairs: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number,
  ) => Promise<Record<string, bigint | number | string>>;
};

export function useFhevm() {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
        const nextInstance = await createInstance({
          ...SepoliaConfig,
          network: window.ethereum ?? RPC_URL,
        });

        if (mounted) {
          setInstance(nextInstance as unknown as FhevmInstance);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          void err;
          setError("Private voting is temporarily unavailable.");
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    instance,
    error,
    isReady: instance !== null && error === null,
  };
}
