"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ThumbnailUploadProps = {
  disabled: boolean;
  imageUrl: string | null;
  open: boolean;
};

export function ThumbnailUpload({ disabled, imageUrl, open }: ThumbnailUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (open) return;
    setFile(null);
    setRemoved(false);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }, [open]);

  const visibleImageUrl = file ? previewUrl : removed ? null : imageUrl;

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    if (!ACCEPTED_IMAGE_TYPES.has(selected.type.toLowerCase())) {
      setError("Choose a JPG, PNG, or WebP image.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (selected.size > MAX_IMAGE_BYTES) {
      setError("Choose an image under 8 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setError("");
    setFile(selected);
    setRemoved(false);
  }

  function removeImage() {
    setFile(null);
    setRemoved(true);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid gap-2 md:col-span-2">
      <span className="text-xs font-semibold text-[#8994aa]" id={`${fieldId}-label`}>Game thumbnail</span>
      <input name="thumbnail" type="hidden" value={removed ? "" : imageUrl ?? ""} />
      <input
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={`${fieldId}-help${error ? ` ${fieldId}-error` : ""}`}
        aria-labelledby={`${fieldId}-label`}
        className="sr-only"
        id={fieldId}
        name="thumbnailFile"
        onChange={(event) => selectFile(event.currentTarget.files?.[0])}
        disabled={disabled}
        type="file"
      />
      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-[#344054] bg-[#0d1119] p-4 sm:flex-row sm:items-center">
        <div className="grid h-24 w-full shrink-0 place-items-center overflow-hidden rounded-xl border border-[#252d3d] bg-[#151a25] text-[#69768e] sm:w-36">
          {visibleImageUrl ? (
            <img alt="Game thumbnail preview" className="h-full w-full object-cover" src={visibleImageUrl} />
          ) : (
            <ImagePlus aria-hidden="true" size={25} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#edf3fd]">
            {file?.name ?? (visibleImageUrl ? "Current thumbnail" : "No image selected")}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#8994aa]" id={`${fieldId}-help`}>
            JPG, PNG, or WebP · up to 8 MB. The image will be uploaded securely when you save.
          </p>
          {error ? <p className="mt-1 text-xs text-[#ffadbd]" id={`${fieldId}-error`} role="alert">{error}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[#2b3547] px-3 py-2.5 text-xs font-semibold text-[#b5c0d3] hover:border-[#83f5c5] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            type="button"
          >
            <Upload aria-hidden="true" size={14} />
            {visibleImageUrl ? "Replace" : "Choose file"}
          </button>
          {visibleImageUrl ? (
            <button
              aria-label="Remove game thumbnail"
              className="grid h-10 w-10 place-items-center rounded-lg border border-[#2b3547] text-[#8994aa] hover:border-[#643443] hover:text-[#ffadbd] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={removeImage}
              disabled={disabled}
              type="button"
            >
              <Trash2 aria-hidden="true" size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
