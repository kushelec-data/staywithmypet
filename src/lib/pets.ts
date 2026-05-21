/** Listing card shape for find-pets search results. */
export type Pet = {
  id: string;
  name: string;
  species: "dog" | "cat" | "rabbit" | "bird";
  breed: string;
  age: string;
  location: string;
  availabilitySummary?: string | null;
  petParentName: string;
  petParentId: string;
  image: string;
  ownerImage: string;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  placeholderColor: string;
  emoji: string;
  sizeLabel?: string | null;
  /** Weight band for meta line (e.g. “5–10 kg”). */
  weightDisplayShort?: string | null;
  careSummary?: string;
  photoUrls?: string[];
  availabilityDates?: string[];
  cardTagline?: string;
};
