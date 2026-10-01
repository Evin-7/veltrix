"use client";

import { Heart, LoaderCircle, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type GameActionsProps = {
  gameSlug: string;
  initialIsFavourite: boolean;
  isAuthenticated: boolean;
};

export function GameActions({ gameSlug, initialIsFavourite, isAuthenticated }: GameActionsProps) {
  const router = useRouter();
  const [isFavourite, setIsFavourite] = useState(initialIsFavourite);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isRecordingPreview, setIsRecordingPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function redirectToLogin() {
    router.push(`/login?next=${encodeURIComponent(`/casino/${gameSlug}`)}`);
  }

  async function toggleFavourite() {
    if (!isAuthenticated) return redirectToLogin();
    setMessage(null);
    setIsSavingFavourite(true);
    try {
      const response = await fetch(`/api/v1/games/${gameSlug}/favourite`, { method: isFavourite ? "DELETE" : "POST" });
      if (response.status === 401) return redirectToLogin();
      if (!response.ok) {
        setMessage("We could not update favourites right now.");
        return;
      }
      const payload = (await response.json()) as { data?: { isFavourite?: boolean } };
      setIsFavourite(Boolean(payload.data?.isFavourite));
    } finally {
      setIsSavingFavourite(false);
    }
  }

  async function recordPreview() {
    if (!isAuthenticated) return redirectToLogin();
    setMessage(null);
    setIsRecordingPreview(true);
    try {
      const response = await fetch(`/api/v1/games/${gameSlug}/recent`, { method: "POST" });
      if (response.status === 401) return redirectToLogin();
      setMessage(response.ok ? "Demo preview saved. No VC was spent." : "We could not save this preview right now.");
    } finally {
      setIsRecordingPreview(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isRecordingPreview} onClick={recordPreview} size="lg" variant="primary">
          {isRecordingPreview ? <LoaderCircle className="animate-spin" size={17} /> : <Play fill="currentColor" size={17} />} Play Demo
        </Button>
        <Button aria-pressed={isFavourite} disabled={isSavingFavourite} onClick={toggleFavourite} size="lg" variant="secondary">
          <Heart fill={isFavourite ? "currentColor" : "none"} size={17} /> {isFavourite ? "Saved" : "Favourite"}
        </Button>
      </div>
      <p className="mt-3 min-h-5 text-xs font-semibold text-mint" aria-live="polite">{message}</p>
    </div>
  );
}
