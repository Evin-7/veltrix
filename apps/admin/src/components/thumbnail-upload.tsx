"use client";

import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { AdminButton } from "@/components/admin-form";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ThumbnailUploadProps = {
  disabled: boolean;
  imageUrl: string | null;
  open: boolean;
  uploading?: boolean;
};

export function ThumbnailUpload({
  disabled,
  imageUrl,
  open,
  uploading = false,
}: ThumbnailUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId().replace(/:/g, "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [dragging, setDragging] = useState(false);
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
    setDragging(false);
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.setCustomValidity("");
    }
  }, [open]);

  const visibleImageUrl = file ? previewUrl : removed ? null : imageUrl;

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    if (!ACCEPTED_IMAGE_TYPES.has(selected.type.toLowerCase())) {
      const message = "Choose a JPG, PNG, or WebP image.";
      setError(message);
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.setCustomValidity(message);
      }
      return;
    }
    if (selected.size > MAX_IMAGE_BYTES) {
      const message = "Choose an image under 8 MB.";
      setError(message);
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.setCustomValidity(message);
      }
      return;
    }
    setError("");
    inputRef.current?.setCustomValidity("");
    setFile(selected);
    setRemoved(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) selectFile(event.dataTransfer.files?.[0]);
  }

  function removeImage() {
    setFile(null);
    setRemoved(true);
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.setCustomValidity("");
    }
  }

  return (
    <div
      className="admin-upload admin-field--wide"
      data-admin-field="thumbnailFile"
    >
      <span className="admin-field-label" id={`${fieldId}-label`}>
        Game thumbnail
      </span>
      <input
        name="thumbnail"
        type="hidden"
        value={removed ? "" : (imageUrl ?? "")}
      />
      <input
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={`${fieldId}-help${error ? ` ${fieldId}-error` : ""}`}
        aria-labelledby={`${fieldId}-label`}
        aria-invalid={Boolean(error) || undefined}
        className="admin-upload-input"
        disabled={disabled}
        id={fieldId}
        name="thumbnailFile"
        onChange={(event) => selectFile(event.currentTarget.files?.[0])}
        tabIndex={-1}
        type="file"
      />
      <div
        className="admin-upload-dropzone"
        data-dragging={dragging || undefined}
        data-invalid={Boolean(error) || undefined}
        data-uploading={uploading || undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="admin-upload-preview">
          {visibleImageUrl ? (
            // The preview may be a local blob URL or a deployment-specific media host.
            // Keep this small admin-only preview unoptimized instead of requiring image host config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Game thumbnail preview"
              className="h-full w-full object-cover"
              src={visibleImageUrl}
            />
          ) : (
            <ImagePlus aria-hidden="true" size={25} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--admin-text-strong)]">
            {file?.name ??
              (visibleImageUrl ? "Current thumbnail" : "No image selected")}
          </p>
          <p className="admin-field-hint mt-1" id={`${fieldId}-help`}>
            JPG, PNG, or WebP · up to 8 MB. The image uploads securely when you
            save.
          </p>
          {error ? (
            <p
              className="admin-field-error mt-1"
              id={`${fieldId}-error`}
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {uploading ? (
            <p
              aria-live="polite"
              className="admin-upload-size admin-upload-state"
              role="status"
            >
              <LoaderCircle
                aria-hidden="true"
                className="admin-button-spinner"
                size={13}
              />
              Uploading securely…
            </p>
          ) : file ? (
            <p className="admin-upload-size" role="status">
              {(file.size / (1024 * 1024)).toFixed(2)} MB selected
            </p>
          ) : null}
        </div>
        <div className="admin-upload-actions flex shrink-0 gap-2">
          <AdminButton
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            size="sm"
            variant="secondary"
          >
            <Upload aria-hidden="true" size={14} />
            {visibleImageUrl ? "Replace" : "Choose file"}
          </AdminButton>
          {visibleImageUrl ? (
            <AdminButton
              aria-label="Remove game thumbnail"
              disabled={disabled}
              onClick={removeImage}
              size="sm"
              variant="danger"
            >
              <Trash2 aria-hidden="true" size={14} />
            </AdminButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
