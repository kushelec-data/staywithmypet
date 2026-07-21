import type { MembershipRole } from "@/lib/membership";
import { membershipRoleToPageQuery } from "@/lib/membership-upsell";

/** Safe internal path for post-checkout return (pet page, profile, etc.). */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const decoded = decodeURIComponent(value.trim());
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.startsWith("/membership")) return null;
  return decoded;
}

export type MembershipPageQuery = {
  role?: MembershipRole | null;
  returnTo?: string | null;
  source?: string | null;
  success?: boolean;
  cancelled?: boolean;
  sessionId?: string | null;
};

export function buildMembershipPagePath(query: MembershipPageQuery = {}): string {
  const params = new URLSearchParams();
  if (query.role) {
    params.set("role", membershipRoleToPageQuery(query.role));
  }
  const returnTo = sanitizeReturnTo(query.returnTo ?? null);
  if (returnTo) {
    params.set("returnTo", returnTo);
  }
  if (query.source?.trim()) {
    params.set("source", query.source.trim());
  }
  if (query.success) {
    params.set("success", "true");
  }
  if (query.cancelled) {
    params.set("cancelled", "true");
  }
  if (query.sessionId?.trim()) {
    params.set("session_id", query.sessionId.trim());
  }
  const qs = params.toString();
  return qs ? `/membership?${qs}` : "/membership";
}

export function buildMembershipUpsellHref(
  role: MembershipRole,
  returnTo?: string | null,
): string {
  return buildMembershipPagePath({ role, returnTo: sanitizeReturnTo(returnTo ?? null) });
}
