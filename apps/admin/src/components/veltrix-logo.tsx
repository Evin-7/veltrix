import Image from "next/image";

type AdminVeltrixLogoProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
};

export function AdminVeltrixLogo({
  alt = "Veltrix",
  className = "",
  priority = false,
}: AdminVeltrixLogoProps) {
  return (
    <span
      aria-hidden={alt.length === 0 ? true : undefined}
      aria-label={alt.length > 0 ? alt : undefined}
      className={`admin-veltrix-logo ${className}`}
      role={alt.length > 0 ? "img" : undefined}
    >
      <Image
        alt=""
        aria-hidden="true"
        className="admin-veltrix-logo-image admin-veltrix-logo-image--dark"
        fill
        priority={priority}
        sizes="(min-width: 640px) 190px, 164px"
        src="/admin/veltrix-wordmark-on-dark.png"
        unoptimized
      />
      <Image
        alt=""
        aria-hidden="true"
        className="admin-veltrix-logo-image admin-veltrix-logo-image--light"
        fill
        priority={priority}
        sizes="(min-width: 640px) 190px, 164px"
        src="/admin/veltrix-wordmark-on-light.png"
        unoptimized
      />
    </span>
  );
}
