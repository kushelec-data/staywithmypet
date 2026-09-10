export type DuplicateRecipientAction = "insert" | "update_language" | "skip_sent";

/** Unique (campaign_id, email): unsent rows take the imported language; sent rows stay frozen. */
export function resolveDuplicateRecipientImport(existing: { status: string } | null): DuplicateRecipientAction {
  if (!existing) return "insert";
  if (existing.status === "sent") return "skip_sent";
  return "update_language";
}
