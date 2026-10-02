"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api-client";
import { errorMessage as safeErrorMessage } from "@/lib/app-error";

type ProfileFormProps = {
  initialDisplayName: string;
};

export function ProfileForm({
  initialDisplayName,
}: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await requestJson("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: displayName.trim() || null }),
      });
      setMessage("Profile saved.");
      showToast("Profile saved", "success");
      router.refresh();
    } catch (error) {
      const message = safeErrorMessage(error, "NETWORK_ERROR");
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-foreground-subtle">
          Display name
        </span>
        <input
          className="field focus-ring"
          maxLength={80}
          onChange={(event) => setDisplayName(event.target.value)}
          value={displayName}
        />
      </label>
      {message ? (
        <p aria-live="polite" className="text-xs font-semibold text-success">
          {message}
        </p>
      ) : null}
      <Button
        className="w-full sm:w-auto"
        disabled={isSaving}
        size="lg"
        type="submit"
      >
        {isSaving ? (
          <>
            <LoaderCircle className="animate-spin" size={16} /> Saving…
          </>
        ) : (
          <>
            Save profile
          </>
        )}
      </Button>
    </form>
  );
}
