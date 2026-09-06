export type EmailEventType =
  | "welcome_pet_parent"
  | "welcome_pet_friend"
  | "email_verified"
  | "phone_verified"
  | "profile_completed"
  | "profile_verified"
  | "request_sent"
  | "request_received"
  | "request_declined_by_you"
  | "request_declined"
  | "request_cancelled_by_you"
  | "request_cancelled"
  | "booking_confirmed"
  | "booking_completed"
  | "review_reminder_parent"
  | "review_reminder_friend"
  | "membership_activated"
  | "membership_renewal_reminder"
  | "membership_expiry_reminder"
  | "booking_starts_tomorrow_parent"
  | "booking_starts_tomorrow_friend"
  | "new_message"
  | "match_digest";

export type EmailRecipientRole = "pet_parent" | "pet_friend";

export type EmailTemplateContext = {
  recipientName?: string;
  recipientRole?: EmailRecipientRole;
  petName?: string;
  petType?: string;
  careType?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  requestedDates?: string[] | null;
  otherPartyName?: string;
  /** Display name of the request receiver (for cancellation emails). */
  receiverName?: string;
  bookingId?: string;
  packageName?: string;
  /** Formatted price line for membership activation emails. */
  membershipPrice?: string;
  /** Localized membership role label (Pet Parent / Pet Friend). */
  membershipRoleLabel?: string;
  renewalDate?: string | null;
  membershipEndDate?: string | null;
  autoRenew?: boolean;
  locale?: "en" | "et";
  message?: string | null;
  senderName?: string;
  conversationId?: string;
  matchDigestKind?: "parent" | "friend";
  matchDigestItems?: Array<{
    name: string;
    location?: string | null;
    reason?: string | null;
    photoUrl?: string | null;
    href: string;
  }>;
};

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};
