/** Central image paths and alt text (reference site + Photo structure mapping). */

export const IMAGE_ALT = {
  about: {
    community: "People forming meaningful connections with pets through shared care",
    foundersStory: "Founders working together on building the Stay With My Pet platform",
  },
  howItWorks: {
    hero: "Woman browsing user profiles on a laptop to find pet care",
    createProfile: "Woman taking a photo of her cat for creating a user profile",
    browse: "Woman browsing user profiles on a laptop",
    chat: "Woman chatting on a laptop with a dog by her side",
    booking: "Man reviewing a booking request on a mobile phone",
    meet: "Two women meeting a dog in a park and getting to know each other",
    feedback: "Man holding a dog while leaving feedback on a laptop",
    petParents: "Pet parent gently stroking a cat at home while managing daily routines",
    petFriends: "Happy pet friends playing with a dog at home and enjoying time together",
    tipsFirstStay: "Two people spending calm time with a dog during a first meet and greet outdoors",
  },
  video: {
    petCards: "Browsing nearby pet profile cards",
    happyPetFriend: "Cozy beagle puppy resting on a sofa at home",
    careRequest: "Reviewing a care request on a calendar",
    chat: "In-app chat with a Pet Friend",
    bookingCalendar: "Confirmed booking on a calendar",
    reviews: "Leaving a star review after a booking",
    newCityDog: "Spending time with a dog outdoors in a new city",
  },
  profiles: {
    sarah: "Caregiver Sarah smiling with a pet",
    james: "Caregiver Josefh with a friendly dog",
    emily: "Caregiver Emmaliya with a pet",
    alex: "Pet Friend profile portrait",
    maria: "Pet Friend portrait with a dog",
    chris: "Pet Friend portrait",
  },
  trust: {
    verified: "Verified community members browsing trusted profiles",
    realHomes: "Pet parent providing gentle home-based care",
    photoUpdates: "Pet Friend sharing feedback after a visit",
    secureMessaging: "Pet Parent chatting with a Pet Friend on a laptop",
  },
} as const;

export const IMAGES = {
  logo: "/logo.png",
  home: {
    caregiverEmily: "/images/home/caregiver-emily.jpg",
    caregiverJosefh: "/images/home/caregiver-josefh.jpg",
    caregiverSarah: "/images/home/caregiver-sarah.jpg",
  },
  about: {
    community: "/images/about/pet-community.jpg",
    foundersStory: "/images/about/founders-story.png",
  },
  howItWorks: {
    hero: "/images/how-it-works/pet-care-steps.jpg",
    createProfile: "/images/how-it-works/create-profile.jpg",
    browse: "/images/how-it-works/pet-care-steps.jpg",
    chat: "/images/how-it-works/connect-chat.jpg",
    booking: "/images/how-it-works/booking-request.jpg",
    meet: "/images/how-it-works/meet-enjoy.jpg",
    feedback: "/images/how-it-works/share-feedback.jpg",
    petParents: "/images/how-it-works/pet-parents-section.jpg",
    petFriends: "/images/how-it-works/pet-friends-section.jpg",
    tipsFirstStay: "/images/how-it-works/tips-first-stay.jpg",
  },
  video: {
    petParent: [
      "/images/video/pet-cards.jpg",
      "/images/pets/luna.jpg",
      "/images/video/care-request.jpg",
      "/images/video/chat.jpg",
      "/images/video/booking-calendar.jpg",
      "/images/video/reviews.jpg",
    ] as const,
    petFriend: [
      "/images/pets/luna.jpg",
      "/images/video/pet-cards.jpg",
      "/images/video/care-request.jpg",
      "/images/video/chat.jpg",
      "/images/video/new-city-dog.jpg",
      "/images/video/reviews.jpg",
    ] as const,
  },
  pets: {
    luna: "/images/pets/luna.jpg",
    mochi: "/images/pets/mochi.jpg",
    buddy: "/images/pets/buddy.jpg",
    pepper: "/images/pets/pepper.jpg",
    charlie: "/images/pets/charlie.jpg",
    daisy: "/images/pets/daisy.jpg",
  },
  /** Demo / fallback Pet Friend portraits (public profile cards, explainer overlays). */
  profiles: {
    sarah: "/images/profiles/sarah.jpg",
    james: "/images/profiles/james.jpg",
    emily: "/images/profiles/emily.jpg",
    alex: "/images/profiles/alex.jpg",
    maria: "/images/profiles/maria.jpg",
    chris: "/images/profiles/chris.jpg",
  },
  placeholders: {
    profile: "/images/placeholders/default-profile.jpg",
    pet: "/images/placeholders/default-pet.jpg",
  },
  trust: {
    verified: "/images/trust/verified-community.jpg",
    realHomes: "/images/trust/real-homes-care.jpg",
    photoUpdates: "/images/trust/photo-updates.jpg",
    secureMessaging: "/images/trust/secure-messaging.jpg",
  },
} as const;

const PROFILE_KEYS = Object.keys(IMAGES.profiles) as (keyof typeof IMAGES.profiles)[];
const PET_KEYS = Object.keys(IMAGES.pets) as (keyof typeof IMAGES.pets)[];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Stable demo portrait when a public profile has no uploaded avatar. */
export function placeholderProfileImage(seed: string): string {
  return IMAGES.profiles[PROFILE_KEYS[hashSeed(seed) % PROFILE_KEYS.length]!]!;
}

/** Stable demo pet photo when a listing has no uploaded image. */
export function placeholderPetImage(seed: string): string {
  return IMAGES.pets[PET_KEYS[hashSeed(seed) % PET_KEYS.length]!]!;
}

/** @deprecated Use IMAGES.profiles — kept for gradual migration */
export const owners = IMAGES.profiles;
