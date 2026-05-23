import type { MembershipPayloadAttempted } from "@/lib/membership-activate";
import type { SupabaseErrorDetail } from "@/lib/supabase-errors";

export class WebhookHandlerError extends Error {
  readonly step: string;
  readonly code: string | null;
  readonly supabaseError: SupabaseErrorDetail | null;
  readonly sessionId: string | null;
  readonly payloadAttempted: MembershipPayloadAttempted | null;

  constructor(
    message: string,
    options: {
      step: string;
      code?: string | null;
      supabaseError?: SupabaseErrorDetail | null;
      sessionId?: string | null;
      payloadAttempted?: MembershipPayloadAttempted | null;
    },
  ) {
    super(message);
    this.name = "WebhookHandlerError";
    this.step = options.step;
    this.code = options.code ?? options.supabaseError?.code ?? null;
    this.supabaseError = options.supabaseError ?? null;
    this.sessionId = options.sessionId ?? null;
    this.payloadAttempted = options.payloadAttempted ?? null;
  }
}

export function isWebhookHandlerError(err: unknown): err is WebhookHandlerError {
  return err instanceof WebhookHandlerError;
}

export type WebhookFailureBody = {
  error: "Webhook handler failed";
  step: string;
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
  supabaseError: SupabaseErrorDetail | null;
  payloadAttempted: MembershipPayloadAttempted | null;
};

export function webhookFailureBody(err: unknown): WebhookFailureBody {
  const handlerErr = isWebhookHandlerError(err) ? err : null;
  const supabaseError = handlerErr?.supabaseError ?? null;
  const message = err instanceof Error ? err.message : String(err);

  return {
    error: "Webhook handler failed",
    step: handlerErr?.step ?? "unknown",
    code: handlerErr?.code ?? supabaseError?.code ?? null,
    message: supabaseError?.message ?? message,
    details: supabaseError?.details ?? null,
    hint: supabaseError?.hint ?? null,
    supabaseError,
    payloadAttempted: handlerErr?.payloadAttempted ?? null,
  };
}
