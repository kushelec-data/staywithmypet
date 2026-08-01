function normalizeHost(host: string): string {
  const trimmed = host.trim().toLowerCase();
  const withoutPort = trimmed.split(":")[0] ?? trimmed;
  return withoutPort;
}

/** Resolves the request host from forwarded headers or the URL. */
export function getRequestHost(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) return normalizeHost(forwarded);

  const host = request.headers.get("host")?.trim();
  if (host) return normalizeHost(host);

  try {
    return normalizeHost(new URL(request.url).host);
  } catch {
    return null;
  }
}

/**
 * Same-origin check for browser-initiated state-changing API routes.
 * Missing or malformed Origin headers are rejected (fail closed).
 */
export function isSameOriginRequest(request: Request): boolean {
  const originHeader = request.headers.get("origin")?.trim();
  if (!originHeader) return false;

  let originHost: string;
  try {
    originHost = normalizeHost(new URL(originHeader).host);
  } catch {
    return false;
  }

  const requestHost = getRequestHost(request);
  if (!requestHost) return false;

  return originHost === requestHost;
}
