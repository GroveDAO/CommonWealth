"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { getErrorMessage } from "@/lib/errors";

export function useContractAction(onSuccess?: () => Promise<void> | void) {
  const publicClient = usePublicClient();
  const { isPending, writeContractAsync } = useWriteContract();
  const [error, setError] = useState<string | null>(null);

  async function execute(config: Parameters<typeof writeContractAsync>[0]) {
    if (!publicClient) {
      const message = "Network client unavailable. Connect a wallet and retry.";
      setError(message);
      throw new Error(message);
    }

    try {
      setError(null);
      const hash = await writeContractAsync(config);
      await publicClient.waitForTransactionReceipt({ hash });
      await onSuccess?.();
      return hash;
    } catch (nextError) {
      const message = getErrorMessage(nextError, "Transaction failed.");
      setError(message);
      throw nextError;
    }
  }

  return {
    error,
    clearError: () => setError(null),
    execute,
    isPending,
  };
}