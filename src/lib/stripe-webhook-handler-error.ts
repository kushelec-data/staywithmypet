import type { MembershipPayloadAttempted } from "@/lib/membership-activate";
import type { SupabaseErrorDetail } from "@/lib/supabase-errors";

export class WebhookHandlerError extends Error {
  readonly step: string;
  readonly supabaseError: SupabaseErrorDetail | null;
  readonly sessionId: string | null;
  readonly payloadAttempted: MembershipPayloadAttempted | null;

  constructor(
    message: string,
    options: {
      step: string;
      supabaseError?: SupabaseErrorDetail | null;
      sessionId?: string | null;
      payloadAttempted?: MembershipPayloadAttempted | null;
    },
  ) {
    super(message);
    this.name = "WebhookHandlerError";
    this.step = options.step;
    this.supabaseError = options.supabaseError ?? null;
    this.sessionId = options.sessionId ?? null;
    this.payloadAttempted = options.payloadAttempted ?? null;
  }
}

export function isWebhookHandlerError(err: unknown): err is WebhookHandlerError {
  return err instanceof WebhookHandlerError;
}
