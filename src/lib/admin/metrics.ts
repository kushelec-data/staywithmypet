export type AdminFunnelStage =
  | "Email not confirmed"
  | "Role not chosen"
  | "Profile incomplete"
  | "Ready, no pet"
  | "Ready, no request activity"
  | "Request sent, waiting"
  | "Chat started, no booking"
  | "Booking created"
  | "Completed booking";

export type AdminFunnelInput = {
  emailConfirmed: boolean;
  roleChosen: boolean;
  profileComplete: boolean;
  wantsPets: boolean;
  petCount: number;
  requestsSent: number;
  requestsReceived: number;
  pendingSent: boolean;
  messagesSent: number;
  bookings: number;
  completedBookings: number;
};

export function deriveAdminFunnelStage(input: AdminFunnelInput): AdminFunnelStage {
  if (!input.emailConfirmed) return "Email not confirmed";
  if (!input.roleChosen) return "Role not chosen";
  if (input.completedBookings > 0) return "Completed booking";
  if (input.bookings > 0) return "Booking created";
  if (input.messagesSent > 0) return "Chat started, no booking";
  if (input.pendingSent) return "Request sent, waiting";
  if (!input.profileComplete) return "Profile incomplete";
  if (input.wantsPets && input.petCount === 0) return "Ready, no pet";
  if (input.requestsSent + input.requestsReceived === 0) return "Ready, no request activity";
  return "Request sent, waiting";
}

export type InteractionLevel = "Very High" | "High" | "Medium" | "Low" | "Very Low";

export const INTERACTION_LEVEL_HELP =
  "Very High = completed booking. High = any booking. Medium = at least one message. Low = request only. Very Low = conversation row only.";

export function deriveInteractionLevel(input: {
  completedBookings: number;
  bookings: number;
  messages: number;
  requests: number;
  conversations: number;
}): InteractionLevel {
  if (input.completedBookings >= 1) return "Very High";
  if (input.bookings >= 1) return "High";
  if (input.messages >= 1) return "Medium";
  if (input.requests >= 1) return "Low";
  if (input.conversations >= 1) return "Very Low";
  return "Very Low";
}

export function countMessagesByConversation(
  messages: Array<{ conversation_id: string }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of messages) {
    map.set(row.conversation_id, (map.get(row.conversation_id) ?? 0) + 1);
  }
  return map;
}

export type MatchConversionInput = {
  generated: number;
  viewed: number;
  clicked: number;
  withLaterRequest: number;
  withLaterBooking: number;
  withLaterCompletedBooking: number;
};

export function matchConversionRates(input: MatchConversionInput) {
  const den = input.generated || 0;
  const pct = (n: number) => (den === 0 ? 0 : Math.round((n / den) * 1000) / 10);
  return {
    viewRate: pct(input.viewed),
    clickRate: pct(input.clicked),
    requestConversion: pct(input.withLaterRequest),
    bookingConversion: pct(input.withLaterBooking),
    completedBookingConversion: pct(input.withLaterCompletedBooking),
  };
}

export function matchHadLaterEvent(
  matchCreatedAt: string,
  laterEvents: Array<{ created_at: string }>,
): boolean {
  return laterEvents.some((event) => event.created_at > matchCreatedAt);
}
