export const ROUTE_TRANSITION_START = "veltrix:navigation-start";
export const ROUTE_TRANSITION_END = "veltrix:navigation-end";
export const ROUTE_TRANSITION_ERROR = "veltrix:navigation-error";

export function beginRouteTransition(target?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ROUTE_TRANSITION_START, { detail: { target } }),
  );
}

export function endRouteTransition() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ROUTE_TRANSITION_END));
}
