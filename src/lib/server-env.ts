import "server-only";

/** Read a server env var at request/runtime (dynamic key avoids build-time inlining). */
export function readServerEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function hasServerEnv(name: string): boolean {
  return Boolean(readServerEnv(name));
}
