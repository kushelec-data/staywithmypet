import "server-only";

import type { Locale } from "@/i18n/translations";
import { createAdminClient } from "@/lib/supabase/admin";

export type EmailLocale = Locale;

export async function resolveEmailLocale(
  userId: string,
  contextLocale?: EmailLocale | null,
): Promise<EmailLocale> {
  if (contextLocale === "et" || contextLocale === "en") {
    return contextLocale;
  }

  const admin = createAdminClient();
  if (!admin) return "en";

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return "en";

  const meta = data.user.user_metadata as Record<string, unknown> | undefined;
  const stored = meta?.swmp_locale ?? meta?.locale;
  if (stored === "et") return "et";
  return "en";
}
