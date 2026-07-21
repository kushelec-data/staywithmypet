import {
  hasActiveMembershipForRole,
  type MembershipRole,
  type UserMembershipsByRole,
} from "@/lib/membership";
import { buildMembershipPagePath } from "@/lib/membership-return";
import type { Dictionary } from "@/i18n/translations";

export type IncomingRequestUpsellVariant = "pet_friend" | "pet_parent" | "fallback";

export type IncomingRequestUpsellCopyInput = {
  petName?: string | null;
  senderName?: string | null;
};

export type IncomingRequestUpsellCopy = {
  title: string;
  body: string;
  buttonLabel: string;
  membershipHref: string;
};

export function receiverNeedsMembershipToAccept(
  memberships: UserMembershipsByRole,
  receiverRole: MembershipRole | null,
): boolean {
  if (!receiverRole) return false;
  return !hasActiveMembershipForRole(memberships, receiverRole);
}

export function resolveIncomingRequestUpsellVariant(
  receiverRole: MembershipRole | null,
): IncomingRequestUpsellVariant {
  if (receiverRole === "pet_friend") return "pet_friend";
  if (receiverRole === "pet_parent") return "pet_parent";
  return "fallback";
}

export function incomingRequestMembershipHref(role: MembershipRole): string {
  return buildMembershipPagePath({
    role,
    source: "incoming-request",
    returnTo: "/requests?direction=incoming",
  });
}

/** Replace {petName} and {senderName} placeholders in translated copy. */
export function formatIncomingRequestUpsellText(
  template: string,
  input: IncomingRequestUpsellCopyInput,
): string {
  const petName = input.petName?.trim() || "";
  const senderName = input.senderName?.trim() || "";
  return template
    .replaceAll("{petName}", petName || "…")
    .replaceAll("{senderName}", senderName || "…");
}

export function pickIncomingRequestPetName(
  requestPetName: string | null | undefined,
  fallback = "…",
): string {
  const trimmed = requestPetName?.trim();
  return trimmed || fallback;
}

export function buildIncomingRequestUpsellCopy(
  copy: Dictionary["requests"]["incomingMembershipUpsell"],
  receiverRole: MembershipRole,
  input: IncomingRequestUpsellCopyInput,
): IncomingRequestUpsellCopy {
  const variant = resolveIncomingRequestUpsellVariant(receiverRole);
  const petName = pickIncomingRequestPetName(input.petName);

  if (variant === "pet_friend") {
    return {
      title: formatIncomingRequestUpsellText(copy.petFriendTitle, { petName }),
      body: formatIncomingRequestUpsellText(copy.petFriendBody, { petName }),
      buttonLabel: copy.petFriendButton,
      membershipHref: incomingRequestMembershipHref("pet_friend"),
    };
  }

  if (variant === "pet_parent") {
    return {
      title: formatIncomingRequestUpsellText(copy.petParentTitle, { petName }),
      body: formatIncomingRequestUpsellText(copy.petParentBody, { petName }),
      buttonLabel: copy.petParentButton,
      membershipHref: incomingRequestMembershipHref("pet_parent"),
    };
  }

  return {
    title: copy.fallbackTitle,
    body: copy.fallbackBody,
    buttonLabel: receiverRole === "pet_parent" ? copy.petParentButton : copy.petFriendButton,
    membershipHref: incomingRequestMembershipHref(receiverRole),
  };
}
