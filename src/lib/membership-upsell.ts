import type { MembershipRole } from "@/lib/membership";
import { isMembershipRequiredError } from "@/lib/membership-access";
import { buildMembershipUpsellHref as buildMembershipHrefWithReturn } from "@/lib/membership-return";
import type { ConversationSummary } from "@/lib/messaging";
import type { Dictionary } from "@/i18n/translations";

/** Booking-linked chats already passed membership gates — never upsell there. */
export function conversationExemptFromMembershipUpsell(
  conversation: ConversationSummary,
): boolean {
  if (conversation.bookingId) return true;
  if (
    conversation.requestStatus === "accepted" ||
    conversation.requestStatus === "completed"
  ) {
    return true;
  }
  if (conversation.bookingStatus && conversation.bookingStatus !== "cancelled") {
    return true;
  }
  return false;
}

/** Show upsell only after a send attempt the server rejected for missing membership. */
export function shouldShowMembershipUpsellAfterMessageSend(
  conversation: ConversationSummary,
  error: unknown,
): boolean {
  if (!isMembershipRequiredError(error)) return false;
  if (conversationExemptFromMembershipUpsell(conversation)) return false;
  return true;
}

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
