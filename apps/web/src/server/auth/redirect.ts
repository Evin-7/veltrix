export function sanitizeNextPath(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return "/";

  try {
    const url = new URL(candidate, "http://veltrix.invalid");
    if (url.origin !== "http://veltrix.invalid") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
