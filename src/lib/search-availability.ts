/** Page-level availability selection for /find-pets and /find-care search. */
export type SearchAvailabilityItem =
  | {
      kind: "pet";
      id: string;
      name: string;
      dates: string[];
    }
  | {
      kind: "profile";
      id: string;
      name: string;
      dates: string[];
    };
