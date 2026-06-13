/** When false, membership checkout uses test access codes instead of Stripe. */
export function isStripeCheckoutEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_STRIPE?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return true;
}
