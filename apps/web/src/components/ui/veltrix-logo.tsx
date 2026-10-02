import Image from "next/image";
import { cn } from "@/lib/cn";

type VeltrixLogoProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
};

export function VeltrixLogo({
  alt = "Veltrix",
  className,
  priority = false,
}: VeltrixLogoProps) {
  return (
    <span className={cn("veltrix-logo", className)}>
      <Image
        alt={alt}
        className="veltrix-logo-image"
        fill
        priority={priority}
        sizes="(min-width: 640px) 164px, 145px"
        src="/veltrix-wordmark.png"
      />
    </span>
  );
}
