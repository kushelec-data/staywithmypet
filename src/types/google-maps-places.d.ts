/** Minimal Google Maps Places types for client-side Autocomplete. */
export {};

type GooglePlaceResult = {
  formatted_address?: string;
  name?: string;
  place_id?: string;
  address_components?: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
  geometry?: { location?: { lat: () => number; lng: () => number } };
};

declare global {
  namespace google.maps.places {
    const PlacesServiceStatus: {
      OK: string;
    };

    class Autocomplete {
      constructor(
        input: HTMLInputElement,
        opts?: { fields?: string[]; types?: string[] },
      );
      addListener(event: string, fn: () => void): void;
      getPlace(): GooglePlaceResult;
    }

    class PlacesService {
      constructor(attrContainer: HTMLDivElement | HTMLMapElement);
      getDetails(
        request: { placeId: string; fields: string[] },
        callback: (result: GooglePlaceResult | null, status: string) => void,
      ): void;
    }
  }

  interface Window {
    google?: {
      maps: {
        places: typeof google.maps.places;
        event?: { clearInstanceListeners: (obj: unknown) => void };
      };
    };
  }
}
