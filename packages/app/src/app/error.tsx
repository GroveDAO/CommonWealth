"use client";

import { SurfaceBanner } from "@/components/shared/SurfaceFeedback";
import { getErrorMessage } from "@/lib/errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <SurfaceBanner
        tone="error"
        title="Application error"
        detail={getErrorMessage(error, "The application hit an unexpected runtime error.")}
        action={
          <button
            onClick={reset}
            className="font-mono text-xs rounded-full px-4 py-2 border border-accent-red/40 text-accent-red bg-accent-red/10"
          >
            Retry
          </button>
        }
      />
    </main>
  );
}