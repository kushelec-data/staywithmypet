/** Parse `#access_token=...&type=recovery` fragments from Supabase implicit recovery links. */
export function parseAuthHash(hash: string): Record<string, string> {
  if (!hash || hash === "#") return {};
  const stripped = hash.startsWith("#") ? hash.slice(1) : hash;
  return Object.fromEntries(new URLSearchParams(stripped));
}

export function buildAuthConfirmPath(params: {
  code?: string | null;
  token_hash?: string | null;
  type?: string | null;
  next?: string;
}): string {
  const search = new URLSearchParams();
  if (params.code) search.set("code", params.code);
  if (params.token_hash) search.set("token_hash", params.token_hash);
  if (params.type) search.set("type", params.type);
  search.set("next", params.next ?? "/reset-password");
  return `/auth/confirm?${search.toString()}`;
}

export const PASSWORD_RESET_PATH = "/reset-password";
