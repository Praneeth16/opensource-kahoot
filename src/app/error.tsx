"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-ink-muted">
        We couldn&apos;t load this page. Check your connection and try again.
      </p>
      <button
        className="btn-primary"
        // reset() alone re-renders the client tree with the same failed server payload. Refresh first, so the
        // retry runs the Server Components again, in one transition with the reset.
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
        type="button"
      >
        Try again
      </button>
    </main>
  );
}
