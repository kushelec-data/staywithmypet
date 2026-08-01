export function excludeMarketplaceSelf<T extends { id: string }>(
  rows: T[],
  excludeUserId: string | null | undefined,
): T[] {
  const selfId = excludeUserId?.trim();
  if (!selfId) return rows;
  return rows.filter((row) => row.id !== selfId);
}

export function excludeMarketplaceOwnPets<T extends { ownerId: string }>(
  pets: T[],
  excludeOwnerId: string | null | undefined,
): T[] {
  const selfId = excludeOwnerId?.trim();
  if (!selfId) return pets;
  return pets.filter((pet) => pet.ownerId !== selfId);
}
