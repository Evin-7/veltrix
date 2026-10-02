import Image from "next/image";
import { cn } from "@/lib/cn";

type VeltrixLogoSurface = "auto" | "light" | "dark";

type VeltrixLogoProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
  surface?: VeltrixLogoSurface;
};

export function VeltrixLogo({
  alt = "Veltrix",
  className,
  priority = false,
  surface = "auto",
}: VeltrixLogoProps) {
  return (
    <span
      aria-hidden={alt.length === 0 ? true : undefined}
      aria-label={alt.length > 0 ? alt : undefined}
      className={cn(
        "veltrix-logo",
        surface !== "auto" && `veltrix-logo--surface-${surface}`,
        className,
      )}
      role={alt.length > 0 ? "img" : undefined}
    >
      <Image
        alt=""
        aria-hidden="true"
        className="veltrix-logo-image veltrix-logo-image--dark"
        fill
        priority={priority}
        sizes="(min-width: 640px) 164px, 145px"
        src="/veltrix-wordmark-on-dark.webp"
        unoptimized
      />
      <Image
        alt=""
        aria-hidden="true"
        className="veltrix-logo-image veltrix-logo-image--light"
        fill
        priority={priority}
        sizes="(min-width: 640px) 164px, 145px"
        src="/veltrix-wordmark-on-light.webp"
        unoptimized
      />
    </span>
  );
}
