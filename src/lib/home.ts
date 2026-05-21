import { IMAGES } from "./images";

export const trustBadges = [
  {
    icon: "🛡️",
    title: "Verified community",
    description: "Profiles built on honesty before anyone connects",
    accent: "bg-pastel-blue/40",
  },
  {
    icon: "🏡",
    title: "Real homes only",
    description: "Home-based companionship — never warehouses or cages",
    accent: "bg-mint/50",
  },
  {
    icon: "📸",
    title: "Photo updates",
    description: "Stay connected while your pet enjoys time with a Pet Friend",
    accent: "bg-lavender/50",
  },
  {
    icon: "💬",
    title: "Secure messaging",
    description: "Message Pet Friends or Pet Parents before you confirm anything",
    accent: "bg-orange/40",
  },
] as const;

export const howItWorksSteps = [
  {
    step: "01",
    title: "Discover trusted matches",
    description:
      "Browse Pet Parents and Pet Friends near you. Read profiles, see photos, and find companionship that fits your pet.",
    accent: "from-pastel-blue/60 to-lavender/30",
  },
  {
    step: "02",
    title: "Connect before you commit",
    description:
      "Share routines and boundaries, then confirm only when it feels right — for pets and people.",
    accent: "from-lavender/50 to-mint/40",
  },
  {
    step: "03",
    title: "Share time with confidence",
    description:
      "Arrange walks, visits, or stays knowing your companion is with someone who cares like family.",
    accent: "from-mint/50 to-orange/30",
  },
] as const;

export const testimonials = [
  {
    id: "1",
    quote:
      "I used to dread leaving Luna anywhere unfamiliar. Now she spends time with Sarah — daily photos, calm updates. I actually enjoy my trips.",
    name: "Emma R.",
    role: "Golden retriever Pet Parent · Brooklyn",
    image: IMAGES.profiles.emily,
    rating: 5,
  },
  {
    id: "2",
    quote:
      "Mochi is shy with new people. James understood immediately. For the first time, we left without guilt.",
    name: "David L.",
    role: "Cat Pet Parent · Austin",
    image: IMAGES.profiles.james,
    rating: 5,
  },
  {
    id: "3",
    quote:
      "The verification process gave me confidence. Buddy had a backyard, belly rubs, and a new best friend.",
    name: "Priya S.",
    role: "Lab Pet Parent · Seattle",
    image: IMAGES.profiles.maria,
    rating: 5,
  },
] as const;
