import type { ProfileRole } from "@/lib/profile-setup";

export type BioPlaceholderCopy = {
  petParent: string;
  petFriend: string;
  both: string;
};

export function bioPlaceholderForRole(role: ProfileRole, copy: BioPlaceholderCopy): string {
  switch (role) {
    case "pet_parent":
      return copy.petParent;
    case "both":
      return copy.both;
    case "pet_friend":
    default:
      return copy.petFriend;
  }
}
