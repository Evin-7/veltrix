import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const gameArtworkCacheHeaders = [
      { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
    ];
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ];

    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/games/:slug/cover.webp", headers: gameArtworkCacheHeaders },
      { source: "/games/:slug/cover.jpg", headers: gameArtworkCacheHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] },
      // Only anonymous, read-only catalog data may be cached at the edge.
      { source: "/api/v1/games", headers: [{ key: "Cache-Control", value: "public, max-age=60, s-maxage=300, stale-while-revalidate=600" }] },
      { source: "/api/v1/games/:slug", headers: [{ key: "Cache-Control", value: "public, max-age=60, s-maxage=300, stale-while-revalidate=600" }] },
      { source: "/api/v1/providers", headers: [{ key: "Cache-Control", value: "public, max-age=60, s-maxage=300, stale-while-revalidate=600" }] },
    ];
  },
};

export default nextConfig;
