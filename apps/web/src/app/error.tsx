"use client";

import { PlayerErrorState } from "@/components/ui/player-error-state";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PlayerErrorState reset={reset} />;
}
