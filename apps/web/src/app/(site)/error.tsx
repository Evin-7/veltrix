"use client";

import { PlayerErrorState } from "@/components/ui/player-error-state";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PlayerErrorState reset={reset} />;
}
