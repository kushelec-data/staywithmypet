import type { SupabaseClient } from "@supabase/supabase-js";

export class AuthRequiredError extends Error {
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Resolve authenticated user id; never trust a client-supplied user id. */
export async function requireAuthUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new AuthRequiredError();
  }

  return user.id;
}

/** Throws when `resourceOwnerId` does not match the signed-in user. */
export function assertOwner(
  resourceOwnerId: string | null | undefined,
  sessionUserId: string,
  message = "You do not have permission to change this.",
): void {
  if (!resourceOwnerId || resourceOwnerId !== sessionUserId) {
    throw new ForbiddenError(message);
  }
}

export async function requireAuthAndOwnership(
  supabase: SupabaseClient,
  resourceOwnerId: string | null | undefined,
): Promise<string> {
  const userId = await requireAuthUserId(supabase);
  assertOwner(resourceOwnerId, userId);
  return userId;
}
