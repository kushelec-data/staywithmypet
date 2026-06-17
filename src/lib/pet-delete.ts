import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteAllPetPhotosForOwner } from "@/lib/pet-photos";
import { formatSupabaseError } from "@/lib/profile-load";

export type DeletePetMode = "soft" | "hard";

export type DeletePetResult = {
  mode: DeletePetMode;
};

async function assertPetOwner(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
): Promise<void> {
  const { assertOwner, requireAuthUserId } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  assertOwner(ownerId, sessionUserId);

  const { data, error } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  if (!data) {
    throw new Error("Pet not found.");
  }
}

async function countRelatedRows(
  supabase: SupabaseClient,
  table: "bookings" | "requests",
  petId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return count ?? 0;
}

async function removePetFavorites(supabase: SupabaseClient, petId: string): Promise<void> {
  const { error } = await supabase.from("favorites").delete().eq("pet_id", petId);
  if (error && !/relation|does not exist/i.test(error.message)) {
    throw new Error(formatSupabaseError(error));
  }
}

async function softDeletePet(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pets")
    .update({
      is_active: false,
      is_public: false,
      availability_dates: [],
    })
    .eq("id", petId)
    .eq("owner_id", ownerId);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

/**
 * Removes a pet profile for its owner.
 * Uses soft delete when bookings or requests exist; otherwise hard deletes the row and storage photos.
 */
export async function deletePetForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  petId: string,
): Promise<DeletePetResult> {
  await assertPetOwner(supabase, ownerId, petId);

  const [bookingCount, requestCount] = await Promise.all([
    countRelatedRows(supabase, "bookings", petId),
    countRelatedRows(supabase, "requests", petId),
  ]);

  await removePetFavorites(supabase, petId);

  if (bookingCount > 0 || requestCount > 0) {
    await softDeletePet(supabase, ownerId, petId);
    return { mode: "soft" };
  }

  await deleteAllPetPhotosForOwner(supabase, ownerId, petId);

  const { error } = await supabase
    .from("pets")
    .delete()
    .eq("id", petId)
    .eq("owner_id", ownerId);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return { mode: "hard" };
}
