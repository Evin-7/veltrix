"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ProfileFormProps = { initialDisplayName: string; initialAvatarUrl: string | null };

export function ProfileForm({ initialDisplayName, initialAvatarUrl }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/v1/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: displayName.trim() || null, avatarUrl: avatarUrl.trim() || null }) });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? "We could not save your profile.");
        return;
      }
      setMessage("Profile saved.");
    } catch {
      setErrorMessage("The service is unavailable right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return <form className="grid gap-5" onSubmit={submit}><label className="block"><span className="mb-2 block text-xs font-semibold text-muted-strong">Display name</span><input className="focus-ring h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-ink outline-none placeholder:text-muted/60 hover:border-white/20 focus:border-amber/50" maxLength={80} onChange={(event) => setDisplayName(event.target.value)} value={displayName} /></label><label className="block"><span className="mb-2 block text-xs font-semibold text-muted-strong">Avatar URL <span className="font-normal text-muted">(optional)</span></span><input className="focus-ring h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-ink outline-none placeholder:text-muted/60 hover:border-white/20 focus:border-amber/50" maxLength={500} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" type="url" value={avatarUrl} /></label>{errorMessage ? <p aria-live="polite" className="rounded-xl border border-[#ff9bbb]/25 bg-[#ff9bbb]/10 px-3 py-2.5 text-xs font-semibold text-[#ffb1c9]">{errorMessage}</p> : null}{message ? <p aria-live="polite" className="rounded-xl border border-mint/20 bg-mint/10 px-3 py-2.5 text-xs font-semibold text-mint">{message}</p> : null}<Button className="w-full sm:w-auto" disabled={isSaving} size="lg" type="submit">{isSaving ? <><LoaderCircle className="animate-spin" size={16} /> Saving…</> : <><Save size={16} /> Save profile</>}</Button></form>;
}
