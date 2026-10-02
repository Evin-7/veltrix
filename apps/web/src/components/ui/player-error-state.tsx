"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ROUTE_TRANSITION_ERROR } from "@/lib/route-transition";

export function PlayerErrorState({ reset }: { reset: () => void }) {
  useEffect(() => {
    window.dispatchEvent(new Event(ROUTE_TRANSITION_ERROR));
  }, []);

  return (
    <main className="page-shell flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-md text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-3 text-5xl text-ink">The table needs a moment.</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          We could not load this page. Your account and balance are safe.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} type="button"><RotateCcw size={15} /> Try again</Button>
          <Link className="button-secondary focus-ring inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm" href="/casino"><ArrowLeft size={15} /> Back to casino</Link>
        </div>
      </div>
    </main>
  );
}
