"use client";

import { Check, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type AvatarCropperProps = {
  disabled?: boolean;
  onCropped: (file: File) => void;
};

type ImageSize = { height: number; width: number };
type Point = { x: number; y: number };
type DragState = Point & { pointerX: number; pointerY: number };

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const CROP_OUTPUT_SIZE = 512;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function AvatarCropper({ disabled = false, onCropped }: AvatarCropperProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [viewportSize, setViewportSize] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  useEffect(() => {
    if (!sourceUrl || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const measure = () => setViewportSize(Math.max(viewport.clientWidth, 1));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [sourceUrl]);

  function clampPosition(next: Point, nextZoom = zoom) {
    if (!imageSize) return next;
    const baseScale = Math.max(
      viewportSize / imageSize.width,
      viewportSize / imageSize.height,
    );
    const maxX = Math.max(
      0,
      (imageSize.width * baseScale * nextZoom - viewportSize) / 2,
    );
    const maxY = Math.max(
      0,
      (imageSize.height * baseScale * nextZoom - viewportSize) / 2,
    );
    return {
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      showToast("Choose a JPG, PNG, or WebP image.", "error");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      showToast("That image is too large. Choose an image under 8 MB.", "error");
      return;
    }

    setImageSize(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setSourceUrl(URL.createObjectURL(file));
  }

  function closeCropper() {
    setSourceUrl(null);
    setImageSize(null);
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  }

  function handleImageLoad() {
    const image = imageRef.current;
    if (!image) return;
    setImageSize({ height: image.naturalHeight, width: image.naturalWidth });
    setPosition({ x: 0, y: 0 });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!imageSize || isCropping) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: position.x,
      y: position.y,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setPosition(
      clampPosition({
        x: drag.x + event.clientX - drag.pointerX,
        y: drag.y + event.clientY - drag.pointerY,
      }),
    );
  }

  function stopDragging(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  }

  function handleZoomChange(nextZoom: number) {
    setZoom(nextZoom);
    setPosition(clampPosition(position, nextZoom));
  }

  async function confirmCrop() {
    const image = imageRef.current;
    if (!image || !imageSize || viewportSize <= 0) return;

    setIsCropping(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = CROP_OUTPUT_SIZE;
      canvas.height = CROP_OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available.");

      const baseScale = Math.max(
        viewportSize / imageSize.width,
        viewportSize / imageSize.height,
      );
      const scaledSource = baseScale * zoom;
      const cropSide = Math.min(imageSize.width, imageSize.height) / zoom;
      const centerX = imageSize.width / 2 - position.x / scaledSource;
      const centerY = imageSize.height / 2 - position.y / scaledSource;
      const sourceX = clamp(
        centerX - cropSide / 2,
        0,
        imageSize.width - cropSide,
      );
      const sourceY = clamp(
        centerY - cropSide / 2,
        0,
        imageSize.height - cropSide,
      );

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSide,
        cropSide,
        0,
        0,
        CROP_OUTPUT_SIZE,
        CROP_OUTPUT_SIZE,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.88),
      );
      if (!blob) throw new Error("The cropped image could not be created.");

      onCropped(new File([blob], "veltrix-avatar.jpg", { type: "image/jpeg" }));
      closeCropper();
    } catch {
      showToast("We could not crop that image. Please try another one.", "error");
    } finally {
      setIsCropping(false);
    }
  }

  return (
    <>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={handleFileSelected}
        ref={inputRef}
        type="file"
      />
      <Button
        className="w-full sm:w-auto"
        disabled={disabled}
        onClick={openFilePicker}
        size="md"
        type="button"
      >
        <Upload size={16} />
        Choose image
      </Button>

      {sourceUrl ? (
        <div
          aria-labelledby="avatar-crop-title"
          aria-modal="true"
          className="fixed inset-0 z-[90] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-[var(--radius-overlay)] border border-border-strong bg-surface-raised p-5 shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Profile image</p>
                <h2 className="mt-2 text-xl font-semibold text-ink" id="avatar-crop-title">
                  Crop your avatar
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Drag the image to position it inside the square.
                </p>
              </div>
              <button
                aria-label="Close image cropper"
                className="focus-ring rounded-full p-2 text-muted hover:bg-surface-hover hover:text-ink"
                onClick={closeCropper}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="relative mx-auto mt-5 aspect-square w-full max-w-80 touch-none select-none overflow-hidden rounded-2xl bg-black/30 ring-1 ring-border-strong"
              onPointerCancel={stopDragging}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              ref={viewportRef}
              style={{ cursor: imageSize ? (isDragging ? "grabbing" : "grab") : "default" }}
            >
              {/* Local object URLs cannot use next/image, but are revoked after the cropper closes. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                draggable={false}
                onLoad={handleImageLoad}
                ref={imageRef}
                src={sourceUrl}
                style={{
                  transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
                }}
              />
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
            </div>

            <label className="mt-5 block text-xs font-semibold text-muted-strong" htmlFor="avatar-zoom">
              Zoom
              <input
                aria-label="Zoom image"
                className="mt-3 block w-full accent-[var(--primary)]"
                id="avatar-zoom"
                max="3"
                min="1"
                onChange={(event) => handleZoomChange(Number(event.target.value))}
                step="0.01"
                type="range"
                value={zoom}
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={isCropping} onClick={closeCropper} type="button">
                Cancel
              </Button>
              <Button
                disabled={!imageSize || isCropping}
                onClick={confirmCrop}
                type="button"
                variant="primary"
              >
                {isCropping ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                Use this image
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
