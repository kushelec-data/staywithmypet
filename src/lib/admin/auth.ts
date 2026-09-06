import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminSession =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 };

export async function isAdminUserId(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data, error } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.user_id);
}

/** Server-only: session user must exist in admin_users (service-role lookup). */
export async function getAdminSession(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };
  const allowed = await isAdminUserId(user.id);
  if (!allowed) return { ok: false, status: 403 };
  return { ok: true, userId: user.id };
}
