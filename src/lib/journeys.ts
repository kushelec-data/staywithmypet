/**
 * Platform journeys — single source of truth for copy and routes.
 *
 * Pet Parent = owns the pet.
 * Pet Friend = borrows, hosts, walks, visits, or spends time with a pet.
 */

export type JourneyId = "pet-friend" | "pet-parent";

export const journeys = {
  "pet-friend": {
    id: "pet-friend" as const,
    role: "Pet Friend",
    shortLabel: "I want to spend time with a pet",
    tagline: "Spend time with pets",
    headline: "Looking for a pet to spend time with?",
    description:
      "Browse pets near you whose Pet Parents welcome responsible companionship — walks, visits, play, and shared time in a warm, home-based community.",
    searchHref: "/find-pets",
    signupHint: "For people who love animals but cannot own a pet full-time — allergies, housing, or lifestyle.",
    searchBlock: {
      label: "Looking for a Pet to Spend Time With?",
      placeholder: "Enter your location...",
      button: "Explore Pets Nearby",
      href: "/find-pets",
      locationName: "pet_location",
    },
    steps: [
      {
        title: "Create your Pet Friend profile",
        description:
          "Share your experience, home environment, and availability — how you can walk, visit, host, or spend time with pets.",
      },
      {
        title: "Search pets near you",
        description:
          "Browse pets listed by Pet Parents. Save favourites and send requests when you find a good match.",
      },
      {
        title: "Enjoy responsible pet companionship",
        description:
          "Agree on routines and boundaries with the Pet Parent, then share meaningful time with their pet.",
      },
    ],
    cta: { label: "Search pets", href: "/find-pets" },
    secondaryCta: { label: "How it works", href: "/how-it-works#pet-friend-workflow" },
  },
  "pet-parent": {
    id: "pet-parent" as const,
    role: "Pet Parent",
    shortLabel: "I need help with my pet",
    tagline: "Get help with your pet",
    headline: "Looking for help with your pet?",
    description:
      "Find trusted Pet Friends near you for walks, home visits, daytime companionship, or stays — flexible, responsible pet sharing without kennels.",
    searchHref: "/find-care",
    signupHint: "For pet owners who travel, work long hours, or want trusted help from animal lovers nearby.",
    searchBlock: {
      label: "Looking for Help With Your Pet?",
      placeholder: "Enter your location...",
      button: "Find a Pet Friend Near Me",
      href: "/find-care",
      locationName: "care_location",
    },
    steps: [
      {
        title: "Add your pet and routines",
        description:
          "Tell Pet Friends about your pet’s personality, needs, and schedule so matches feel safe and clear.",
      },
      {
        title: "Find Pet Friends near you",
        description:
          "Browse people who want to walk, visit, host, or spend time with pets. Message before you confirm anything.",
      },
      {
        title: "Arrange care with confidence",
        description:
          "Set expectations together. Membership unlocks messaging and bookings — no payments between users.",
      },
    ],
    cta: { label: "Find care", href: "/find-care" },
    secondaryCta: { label: "How it works", href: "/how-it-works#pet-parent-workflow" },
  },
} as const;

export const searchSectionContent = {
  title: "Find a Pet or a Pet Friend Near You",
  subtitle:
    "Discover trusted Pet Parents and Pet Friends in your area. Whether you want companionship with a pet or help for your own, it starts here.",
} as const;

export function getJourney(id: JourneyId) {
  return journeys[id];
}
