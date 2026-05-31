import type { MembershipRole } from "@/lib/membership";
import { buildMembershipUpsellHref as buildMembershipHrefWithReturn } from "@/lib/membership-return";
import type { Dictionary } from "@/i18n/translations";

export type MembershipUpsellVariant = "searchPet" | "findCare" | "fallback";

/** URL query values for /membership?role= */
export type MembershipPageRoleQuery = "parent" | "friend";

export function parseMembershipPageRole(value: string | null): MembershipRole | null {
  const v = value?.trim().toLowerCase();
  if (v === "parent" || v === "pet_parent") return "pet_parent";
  if (v === "friend" || v === "pet_friend") return "pet_friend";
  return null;
}

export function membershipRoleToPageQuery(role: MembershipRole): MembershipPageRoleQuery {
  return role === "pet_parent" ? "parent" : "friend";
}

export function membershipUpsellHref(role: MembershipRole, returnTo?: string | null): string {
  return buildMembershipHrefWithReturn(role, returnTo);
}

export function membershipUpsellVariantForRequest(target: {
  kind: "pet" | "profile";
}): MembershipUpsellVariant {
  return target.kind === "pet" ? "searchPet" : "findCare";
}

export function membershipUpsellCopy(
  variant: MembershipUpsellVariant,
  name: string | undefined,
  t: Dictionary["membershipUpsell"],
): { title: string; body: string } {
  const trimmed = name?.trim() ?? "";
  const withName = (template: string) =>
    trimmed ? template.replace("{name}", trimmed) : template.replace("{name}", "…");

  if (variant === "searchPet") {
    return {
      title: t.oneStepTitle,
      body: withName(t.searchPetBody),
    };
  }
  if (variant === "findCare") {
    return {
      title: t.oneStepTitle,
      body: withName(t.findCareBody),
    };
  }
  return { title: t.fallbackTitle, body: t.fallbackBody };
}
