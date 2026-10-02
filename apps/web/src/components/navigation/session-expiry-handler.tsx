"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { beginRouteTransition } from "@/lib/route-transition";

export function SessionExpiryHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const handling = useRef(false);

  useEffect(() => {
    function handleSessionExpired() {
      if (handling.current || pathname === "/login" || pathname === "/register") return;
      handling.current = true;
      showToast("Your session has expired. Please sign in again.", "error");
      const next = `${window.location.pathname}${window.location.search}`;
      beginRouteTransition("/login");
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
    window.addEventListener("veltrix:session-expired", handleSessionExpired);
    return () => window.removeEventListener("veltrix:session-expired", handleSessionExpired);
  }, [pathname, router, showToast]);

  useEffect(() => {
    handling.current = false;
  }, [pathname]);

  return null;
}
