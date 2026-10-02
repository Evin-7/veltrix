"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import {
  ROUTE_TRANSITION_END,
  ROUTE_TRANSITION_ERROR,
  ROUTE_TRANSITION_START,
} from "@/lib/route-transition";

function isInternalPageLink(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.dataset.noRouteLoader !== undefined) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("/api/")) return false;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }
  return url.origin === window.location.origin && url.pathname !== window.location.pathname;
}

export function RouteTransitionOverlay() {
  const pathname = usePathname();
  const [navigationPath, setNavigationPath] = useState<string | null>(null);
  const isNavigating = navigationPath === pathname;

  useEffect(() => {
    function start() {
      setNavigationPath(pathname);
    }
    function finish() {
      setNavigationPath(null);
    }
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (anchor instanceof HTMLAnchorElement && isInternalPageLink(anchor)) {
        start();
      }
    }
    function handlePopState() {
      start();
    }

    window.addEventListener(ROUTE_TRANSITION_START, start);
    window.addEventListener(ROUTE_TRANSITION_END, finish);
    window.addEventListener(ROUTE_TRANSITION_ERROR, finish);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener(ROUTE_TRANSITION_START, start);
      window.removeEventListener(ROUTE_TRANSITION_END, finish);
      window.removeEventListener(ROUTE_TRANSITION_ERROR, finish);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname]);

  if (!isNavigating) return null;
  return <FullScreenLoader className="route-transition-loader" label="Loading page" />;
}
