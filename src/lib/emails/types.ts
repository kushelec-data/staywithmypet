export type EmailEventType =
  | "welcome_pet_parent"
  | "welcome_pet_friend"
  | "email_verified"
  | "phone_verified"
  | "profile_completed"
  | "request_sent"
  | "request_received"
  | "request_declined_by_you"
  | "request_declined"
  | "booking_confirmed"
  | "booking_completed"
  | "review_reminder_parent"
  | "review_reminder_friend"
  | "membership_activated"
  | "membership_renewal_reminder"
  | "membership_expiry_reminder";

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
  bookingId?: string;
  packageName?: string;
  renewalDate?: string | null;
  membershipEndDate?: string | null;
  autoRenew?: boolean;
};

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};
