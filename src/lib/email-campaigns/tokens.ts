import { randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function createOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function isOpaqueTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

export function trackingUrlContainsIdentityLeak(url: string, email: string, userId?: string | null): boolean {
  const lower = url.toLowerCase();
  if (email && lower.includes(email.toLowerCase())) return true;
  if (userId && lower.includes(userId.toLowerCase())) return true;
  return false;
}
