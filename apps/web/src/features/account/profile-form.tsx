"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
import { AvatarCropper } from "@/features/account/avatar-cropper";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api-client";
import { errorMessage as safeErrorMessage } from "@/lib/app-error";

type ProfileFormProps = {
  initialDisplayName: string;
  initialAvatarUrl: string | null;
};

export function ProfileForm({
  initialDisplayName,
  initialAvatarUrl,
}: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl);
    };
  }, [previewAvatarUrl]);

  const visibleAvatarUrl = previewAvatarUrl ?? avatarUrl;

  function handleCroppedAvatar(file: File) {
    setPendingAvatar(file);
    setPreviewAvatarUrl(URL.createObjectURL(file));
    setMessage(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      let nextAvatarUrl = avatarUrl.trim() || null;
      if (pendingAvatar) {
        const formData = new FormData();
        formData.append("file", pendingAvatar);
        const upload = await requestJson<{ avatarUrl: string }>(
          "/api/v1/users/me/avatar",
          {
            body: formData,
            method: "POST",
          },
        );
        nextAvatarUrl = upload.avatarUrl;
      }

      await requestJson("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          avatarUrl: nextAvatarUrl,
        }),
      });
      setAvatarUrl(nextAvatarUrl ?? "");
      setPendingAvatar(null);
      setPreviewAvatarUrl(null);
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
      <div className="block">
        <span className="mb-2 block text-xs font-semibold text-foreground-subtle">
          Profile image{" "}
          <span className="font-normal text-foreground-muted">(optional)</span>
        </span>
        <div className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-border bg-surface-hover/30 p-3 sm:flex-row sm:items-center">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#e8b86a] to-[#a86246] text-sm font-bold text-[#17110a]"
            style={visibleAvatarUrl ? { backgroundImage: `url(\"${visibleAvatarUrl}\")`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
          >
            {visibleAvatarUrl ? <span className="sr-only">Current profile image</span> : "V"}
          </span>
          <div className="min-w-0 flex-1">
            <AvatarCropper disabled={isSaving} onCropped={handleCroppedAvatar} />
            <p className="mt-2 text-[11px] leading-4 text-muted">
              JPG, PNG, or WebP · up to 8 MB · you can crop before saving
            </p>
          </div>
        </div>
        <div className="mt-3">
          <span className="mb-2 block text-[11px] font-semibold text-muted">
            Or paste an HTTPS image URL
          </span>
          <input
            className="field focus-ring"
            maxLength={500}
            onChange={(event) => {
              setAvatarUrl(event.target.value);
              setPendingAvatar(null);
              setPreviewAvatarUrl(null);
            }}
            placeholder="https://…"
            type="url"
            value={avatarUrl}
          />
        </div>
      </div>
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
