"use server";

import { deliverCareRequestNotifications } from "@/lib/request-delivery";
import { createCareRequest, type CreateCareRequestInput } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

export type SubmitCareRequestInput = Omit<CreateCareRequestInput, "senderId">;

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Creates a care request server-side and delivers owner/requester email notifications.
 * Email failures are logged but never block a successful insert.
 */
export async function submitCareRequestAction(
  input: SubmitCareRequestInput,
): Promise<{ requestId: string }> {
  const userId = await requireUserId();
  if (!userId) {
    throw new Error("Not signed in.");
  }

  const supabase = await createClient();
  const { requestId } = await createCareRequest(supabase, {
    ...input,
    senderId: userId,
  });

  console.info("[request-email] request created", {
    requestId,
    senderId: userId,
    receiverId: input.receiverId,
    petId: input.petId,
    petParentId: input.petParentId,
    petFriendId: input.petFriendId,
  });

  try {
    await deliverCareRequestNotifications(requestId, userId);
  } catch (err) {
    console.error("[request-email] error", {
      requestId,
      stage: "deliverCareRequestNotifications",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return { requestId };
}
