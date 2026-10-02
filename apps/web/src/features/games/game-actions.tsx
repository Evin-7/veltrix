"use client";

import { Heart, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { requestJson } from "@/lib/api-client";
import { errorMessage } from "@/lib/app-error";
import { beginRouteTransition } from "@/lib/route-transition";

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
  const [isLaunching, setIsLaunching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  function redirectToLogin() {
    beginRouteTransition("/login");
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
      const payload = await requestJson<{ isFavourite?: boolean }>(`/api/v1/games/${gameSlug}/favourite`, { method: nextValue ? "POST" : "DELETE" });
      const savedValue = Boolean(payload.isFavourite);
      setIsFavourite(savedValue);
      setIsFavouritePopping(savedValue);
      window.dispatchEvent(new CustomEvent("veltrix:favourite-changed", { detail: { slug: gameSlug, isFavourite: savedValue } }));
      showToast(savedValue ? "Added to favourites" : "Removed from favourites", "success", { card: savedValue ? { rank: "K", suit: "♥" } : { rank: "J", suit: "♠" }, variant: "premium" });
    } catch (error) {
      setIsFavourite(previousValue);
      setIsFavouritePopping(false);
      setMessage(errorMessage(error, "CONFLICT"));
      showToast(errorMessage(error, "CONFLICT"), "error");
    } finally {
      setIsSavingFavourite(false);
    }
  }

  function launchGame() {
    if (!isAuthenticated) return redirectToLogin();
    setMessage(null);
    setIsLaunching(true);
    beginRouteTransition(`/casino/${gameSlug}/play`);
    router.push(`/casino/${gameSlug}/play`);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isLaunching} onClick={launchGame} size="lg" variant="primary">
          {isLaunching ? <LoaderCircle className="animate-spin" size={17} /> : null} {isLaunching ? "Opening…" : "Play"}
        </Button>
        <Button aria-label={isSavingFavourite ? "Saving favourite" : isFavourite ? `Remove ${gameName} from favourites` : `Add ${gameName} to favourites`} aria-pressed={isFavourite} disabled={isSavingFavourite} onClick={toggleFavourite} size="lg" variant="secondary">
          {isSavingFavourite ? <LoaderCircle className="animate-spin" size={17} /> : <Heart className={cn(isFavourite ? "text-favorite" : "text-foreground-muted", isFavouritePopping && "favorite-heart-pop")} fill={isFavourite ? "currentColor" : "none"} size={17} />} {isSavingFavourite ? "Saving…" : isFavourite ? "Saved" : "Favourite"}
        </Button>
      </div>
      <p className="mt-3 min-h-5 text-xs font-semibold text-mint" aria-live="polite">{message}</p>
    </div>
  );
}
