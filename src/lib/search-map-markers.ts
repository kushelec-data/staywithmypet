export type SearchMapMarkerVariant = "pets" | "friends";

export type SearchMapMarker = {
  id: string;
  variant: SearchMapMarkerVariant;
  name: string;
  locationArea: string | null;
  photoUrl: string | null;
  lat: number;
  lng: number;
  href: string;
  ratingAvg?: number;
  ratingCount?: number;
  careTypes?: string[];
};

/** @deprecated use SearchMapMarker */
export type PetMapMarker = SearchMapMarker;
