export function stripeCheckoutIdempotencyKey(input: {
  userId: string;
  role: string;
  planId: string;
  nowMs?: number;
  windowMs?: number;
}): string {
  const windowMs = input.windowMs ?? 30_000;
  const bucket = Math.floor((input.nowMs ?? Date.now()) / windowMs);
  return `swmp_chk_${input.userId}_${input.role}_${input.planId}_${bucket}`.slice(0, 255);
}
