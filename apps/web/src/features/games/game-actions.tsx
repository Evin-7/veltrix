"use client";

import { Heart, LoaderCircle, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type GameActionsProps = {
  gameName: string;
  gameSlug: string;
  initialIsFavourite: boolean;
  isAuthenticated: boolean;
};

export function GameActions({ gameName, gameSlug, initialIsFavourite, isAuthenticated }: GameActionsProps) {
  const router = useRouter();
  const [isFavourite, setIsFavourite] = useState(initialIsFavourite);
  const [isFavouritePopping, setIsFavouritePopping] = useState(false);
  const [isSavingFavourite, setIsSavingFavourite] = useState(false);
  const [isRecordingPreview, setIsRecordingPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  function redirectToLogin() {
    router.push(`/login?next=${encodeURIComponent(`/casino/${gameSlug}`)}`);
  }

  async function toggleFavourite() {
    if (!isAuthenticated) return redirectToLogin();
    const previousValue = isFavourite;
    const nextValue = !previousValue;
    setMessage(null);
    setIsFavourite(nextValue);
    setIsFavouritePopping(nextValue);
    setIsSavingFavourite(true);
    try {
      const response = await fetch(`/api/v1/games/${gameSlug}/favourite`, { method: nextValue ? "POST" : "DELETE" });
      if (response.status === 401) { setIsFavourite(previousValue); setIsFavouritePopping(false); return redirectToLogin(); }
      if (!response.ok) throw new Error("Favourite update failed");
      const payload = (await response.json()) as { data?: { isFavourite?: boolean } };
      const savedValue = Boolean(payload.data?.isFavourite);
      setIsFavourite(savedValue);
      setIsFavouritePopping(savedValue);
      window.dispatchEvent(new CustomEvent("veltrix:favourite-changed", { detail: { slug: gameSlug, isFavourite: savedValue } }));
      showToast(savedValue ? "Added to favourites" : "Removed from favourites", "success");
    } catch {
      setIsFavourite(previousValue);
      setIsFavouritePopping(false);
      setMessage("We could not update favourites right now.");
      showToast("Couldn’t update favourites", "error");
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
        <Button aria-label={isFavourite ? `Remove ${gameName} from favourites` : `Add ${gameName} to favourites`} aria-pressed={isFavourite} disabled={isSavingFavourite} onClick={toggleFavourite} size="lg" variant="secondary">
          <Heart className={cn(isFavourite ? "text-favorite" : "text-foreground-muted", isFavouritePopping && "favorite-heart-pop")} fill={isFavourite ? "currentColor" : "none"} size={17} /> {isFavourite ? "Saved" : "Favourite"}
        </Button>
      </div>
      <p className="mt-3 min-h-5 text-xs font-semibold text-mint" aria-live="polite">{message}</p>
    </div>
  );
}
