import { buildFindCareUrl } from "@/lib/care-search-params";

export type CareTypeSlug =
  | "daycare"
  | "walks"
  | "overnight-care"
  | "home-visits"
  | "feeding-only"
  | "play-visits";

export type CareTypeSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type CareTypeContent = {
  slug: CareTypeSlug;
  name: string;
  icon: string;
  href: `/care/${CareTypeSlug}`;
  /** Pre-selected value for /find-care?careTypes= */
  findCareFilter: string;
  findCareHref: string;
  cardSummary: { en: string; et: string };
  meta: { title: string; description: string };
  heroTitle: string;
  intro: string;
  whatIsIt: CareTypeSection;
  whoIsItFor: CareTypeSection;
  whyChoose: CareTypeSection;
  howItWorks: CareTypeSection;
  cta: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel?: string;
    secondaryHref?: string;
    imageSrc?: string;
    imageAlt?: string;
  };
};

const CARE_TYPE_LIST: CareTypeContent[] = [
  {
    slug: "daycare",
    name: "Daycare",
    icon: "🏠",
    href: "/care/daycare",
    findCareFilter: "Daycare",
    findCareHref: buildFindCareUrl("Daycare"),
    cardSummary: {
      en: "Calm, home-based daycare in a real home—not a facility. Daytime companionship with feeding, play, rest, and emotional support.",
      et: "Rahulik päevahoid päris kodus—not asutuses. Päevane selts toitmise, mängu ja puhkeajaga.",
    },
    meta: {
      title: "Pet Daycare in a Home Environment",
      description:
        "Calm, home-based pet daycare through Stay With My Pet—daytime companionship in a trusted home, not a noisy facility.",
    },
    heroTitle: "Calm, home-based daycare for your pet",
    intro:
      "Pet daycare through Stay With My Pet offers daytime companionship in a real home—not a noisy facility or cage-based environment. Your pet spends the day relaxed, cared for, and emotionally supported.",
    whatIsIt: {
      title: "What is home pet daycare?",
      paragraphs: [
        "Daycare means your pet stays with a Pet Friend for several daytime hours. This includes feeding, play, rest, and companionship in a calm household setting.",
        "It's a gentle alternative to large daycare centres.",
      ],
    },
    whoIsItFor: {
      title: "Who is daycare best for?",
      bullets: [
        "Pets who don't like being alone all day",
        "Social animals who enjoy company",
        "Owners working long hours",
        "Dogs and cats needing mental stimulation",
      ],
    },
    whyChoose: {
      title: "Why choose home daycare over a pet hotel?",
      paragraphs: ["Pet hotels focus on supervision. Home daycare focuses on belonging."],
      bullets: [
        "Real home, not a facility",
        "Small numbers or one pet only",
        "Personal care and attention",
        "Less stress, more comfort",
      ],
    },
    howItWorks: {
      title: "How daycare works on Stay With My Pet",
      bullets: [
        "Owners define daytime care needs",
        "Pet Friends apply and match",
        "Daycare takes place during agreed hours",
      ],
    },
    cta: {
      title: "Explore home daycare options",
      description: "Find trusted Pet Friends nearby who offer calm, home-based daycare.",
      primaryLabel: "Find daycare",
      secondaryLabel: "How pet sharing works",
      secondaryHref: "/how-it-works",
      imageSrc: "/images/trust/real-homes-care.jpg",
      imageAlt: "Pet Friend providing gentle home-based daycare",
    },
  },
  {
    slug: "walks",
    name: "Walks",
    icon: "🦮",
    href: "/care/walks",
    findCareFilter: "Walks only",
    findCareHref: buildFindCareUrl("Walks only"),
    cardSummary: {
      en: "Reliable, one-to-one walks that fit your pet's routine. Personal outdoor care—not rushed routes or group chaos.",
      et: "Kindlad üks-ühele jalutised sinu lemmiku rütmi järgi. Isiklik välishooldus ilma kiirustamata.",
    },
    meta: {
      title: "Dog Walks & Outdoor Care",
      description:
        "Reliable dog walks through Stay With My Pet—consistent, routine-based outdoor care with a trusted Pet Friend.",
    },
    heroTitle: "Reliable dog walks that fit your pet's daily routine",
    intro:
      "Dog walks through Stay With My Pet offer consistent, one-to-one outdoor care that keeps your dog active, calm, and happy—even when your schedule is full. Instead of short, task-focused walks, our approach is personal, routine-based, and built on trust.",
    whatIsIt: {
      title: "What are dog walk services?",
      paragraphs: [
        "Dog walks involve taking your dog outside for physical exercise, fresh air, and mental stimulation according to your usual schedule. Walk length, pace, and environment are agreed in advance.",
        "This service focuses solely on walking—no rushed routes, no group chaos, just attentive care.",
      ],
    },
    whoIsItFor: {
      title: "Who are dog walks best for?",
      bullets: [
        "Working professionals with long weekdays",
        "Dogs who need regular exercise and structure",
        "Senior owners who need occasional support",
        "Dogs that prefer one-on-one attention",
      ],
    },
    whyChoose: {
      title: "Why choose Stay With My Pet instead of a traditional dog walking service?",
      paragraphs: [
        "Traditional dog walking services often focus on completing scheduled walks efficiently. We focus on continuity, compatibility, and connection.",
      ],
      bullets: [
        "One dog, one walker",
        "Walks follow your dog's routine",
        "Familiar routes and environments",
        "Ongoing relationship with a trusted person",
      ],
    },
    howItWorks: {
      title: "How dog walks work on Stay With My Pet",
      bullets: [
        "Owners list walk needs and preferences",
        "Pet Friends apply based on availability",
        "Matches are confirmed before walks begin",
        "Walks take place regularly or occasionally",
      ],
    },
    cta: {
      title: "Ready to find walk support?",
      description: "Browse Pet Friends who offer reliable walks near you.",
      primaryLabel: "Find Pet Friends for walks",
      secondaryLabel: "Explore other care options",
      secondaryHref: "/#services",
    },
  },
  {
    slug: "overnight-care",
    name: "Overnight care",
    icon: "🌙",
    href: "/care/overnight-care",
    findCareFilter: "Overnight care / 24h stay",
    findCareHref: buildFindCareUrl("Overnight care / 24h stay"),
    cardSummary: {
      en: "Loving overnight care that feels like home—not a kennel. Calm, one-to-one 24-hour care with familiar routines and emotional comfort.",
      et: "Armastav ööhoid, mis tundub nagu kodus—not kennel. Rahulik üks-ühele ööpäevane hooldus tuttavate rutiinidega.",
    },
    meta: {
      title: "Overnight Pet Care in a Home Environment",
      description:
        "Home-based overnight pet care through Stay With My Pet—calm, one-to-one stays in a real home with a trusted Pet Friend.",
    },
    heroTitle: "Loving overnight pet care that feels like home",
    intro:
      "When you need to be away overnight or for several days, your pet deserves more than a kennel or hotel. Overnight care offers calm, home-based, one-to-one care in a real home—with a trusted Pet Friend who follows familiar routines.",
    whatIsIt: {
      title: "What is overnight pet care?",
      paragraphs: [
        "Overnight pet care means your pet is looked after continuously for a full 24-hour period. Care can take place either at the Pet Friend's home or at your own home, depending on your pet's needs.",
        "This includes feeding, walks, playtime, rest, medication (if required), and companionship—just like your pet would receive at home.",
      ],
    },
    whoIsItFor: {
      title: "Who is overnight care best for?",
      bullets: [
        "Dogs and cats who don't do well in kennels or noisy environments",
        "Pets who need routines, medication, or extra attention",
        "Owners travelling for weekends, holidays, or work trips",
        "Senior pets or anxious animals who need calm, consistent care",
      ],
    },
    whyChoose: {
      title: "Why choose overnight care instead of a pet hotel?",
      paragraphs: [
        "Pet hotels and kennels focus on supervision. Stay With My Pet focuses on connection.",
      ],
      bullets: [
        "Care happens in a real home, not a facility",
        "Your pet stays with one dedicated caregiver",
        "Emotional well-being matters as much as physical care",
        "Care follows your pet's existing routine",
        "You can choose recurring or occasional stays",
      ],
    },
    howItWorks: {
      title: "How overnight care works on Stay With My Pet",
      bullets: [
        "Pet Parents create a detailed pet profile with routines and needs",
        "Pet Friends browse and apply based on availability and experience",
        "Both sides choose the best match before confirming care",
        "Overnight care takes place with clear expectations and trust",
      ],
    },
    cta: {
      title: "Ready to explore overnight pet care?",
      description: "Find Pet Friends who offer calm, home-based overnight stays.",
      primaryLabel: "Find Pet Friends for overnight care",
      secondaryLabel: "Compare care options",
      secondaryHref: "/#services",
    },
  },
  {
    slug: "home-visits",
    name: "Home Visits",
    icon: "💚",
    href: "/care/home-visits",
    findCareFilter: "Home visits",
    findCareHref: buildFindCareUrl("Home visits"),
    cardSummary: {
      en: "Care in your pet's own home—feeding, fresh water, litter care, and quality time. Ideal for pets who value routine and calm.",
      et: "Hooldus lemmiku kodus—toitmine, vesi, liivakasti hooldus ja kvaliteetaeg. Sobib rutiinile kinnistunud lemmikutele.",
    },
    meta: {
      title: "Pet Home Visits",
      description:
        "Scheduled home visits through Stay With My Pet—your pet stays in familiar surroundings while receiving proper care and attention.",
    },
    heroTitle: "Care for your pet in the comfort of their own home",
    intro:
      "Home visits allow your pet to stay in familiar surroundings while still receiving proper care, attention, and check-ins. Perfect for pets who value routine and calm.",
    whatIsIt: {
      title: "What are pet home visits?",
      paragraphs: ["A Pet Friend visits your home to:"],
      bullets: [
        "Feed your pet",
        "Refresh water",
        "Clean litter boxes or cages",
        "Spend quality time together",
      ],
    },
    whoIsItFor: {
      title: "Who are home visits best for?",
      bullets: [
        "Cats and small pets",
        "Senior animals",
        "Pets sensitive to change",
        "Owners who prefer minimal disruption",
      ],
    },
    whyChoose: {
      title: "Why choose home visits instead of a sitter or hotel?",
      bullets: [
        "Your pet stays home",
        "Care is calm and personal",
        "No transport or relocation stress",
      ],
    },
    howItWorks: {
      title: "How home visits work",
      bullets: [
        "Owners list visit needs",
        "Pet Friends apply",
        "Visits take place as scheduled",
      ],
    },
    cta: {
      title: "Find pets that need home visits",
      description: "Browse Pet Friends who offer calm, in-home visit care.",
      primaryLabel: "Find Pet Friends for home visits",
      secondaryLabel: "Compare care types",
      secondaryHref: "/#services",
    },
  },
  {
    slug: "feeding-only",
    name: "Feeding only",
    icon: "🍽️",
    href: "/care/feeding-only",
    findCareFilter: "Feeding only",
    findCareHref: buildFindCareUrl("Feeding only"),
    cardSummary: {
      en: "Simple, reliable feeding visits at home—meals and fresh water when that's all your pet needs. No extras, no stress.",
      et: "Lihtne, usaldusväärne toitmine kodus—söögid ja värske vesi, kui muud pole vaja.",
    },
    meta: {
      title: "Feeding Only Visits",
      description:
        "Feeding-only home visits through Stay With My Pet—essential care without unnecessary extras.",
    },
    heroTitle: "Simple, reliable feeding when that's all your pet needs",
    intro:
      "Feeding-only visits provide essential care without unnecessary extras. Ideal when your pet is independent but needs consistent meals.",
    whatIsIt: {
      title: "What are feeding-only visits?",
      paragraphs: [
        "A Pet Friend visits your home to feed your pet and ensure fresh water is available—nothing more, nothing less.",
      ],
    },
    whoIsItFor: {
      title: "Who are feeding visits best for?",
      bullets: [
        "Cats",
        "Fish and reptiles",
        "Rodents and birds",
        "Short absences",
      ],
    },
    whyChoose: {
      title: "Why choose this instead of full care?",
      bullets: [
        "You avoid unnecessary services",
        "You avoid moving your pet",
        "You avoid stressful environments",
      ],
    },
    howItWorks: {
      title: "How feeding visits work",
      bullets: [
        "Owners set feeding instructions",
        "Pet Friends confirm availability",
        "Visits take place as agreed",
      ],
    },
    cta: {
      title: "Need simple feeding support?",
      description: "Find Pet Friends available for reliable feeding-only visits.",
      primaryLabel: "Find Pet Friends for feeding visits",
      secondaryLabel: "Explore play visits",
      secondaryHref: "/care/play-visits",
    },
  },
  {
    slug: "play-visits",
    name: "Play visits",
    icon: "🎾",
    href: "/care/play-visits",
    findCareFilter: "Play visits",
    findCareHref: buildFindCareUrl("Play visits"),
    cardSummary: {
      en: "Short visits focused on play, cuddles, and connection—because pets need more than food. Real companionship, not just a check-in.",
      et: "Lühikesed külastused mängu, kaisutamise ja sideme jaoks—lemmik vajab rohkem kui toitu.",
    },
    meta: {
      title: "Play Visits & Companionship",
      description:
        "Play visits through Stay With My Pet—focused interaction, attention, and emotional enrichment for your pet.",
    },
    heroTitle: "Short visits focused on play, attention, and connection",
    intro:
      "Play visits provide emotional enrichment through focused interaction—because pets need more than just food.",
    whatIsIt: {
      title: "What are play visits?",
      paragraphs: ["A Pet Friend spends time:"],
      bullets: ["Playing", "Cuddling", "Engaging mentally"],
    },
    whoIsItFor: {
      title: "Who are play visits best for?",
      bullets: [
        "Young, energetic pets",
        "Social animals",
        "Pets prone to boredom or loneliness",
      ],
    },
    whyChoose: {
      title: "Why choose play visits over task-only solutions?",
      paragraphs: [
        "Because some needs can't be automated or rushed. Unlike options that focus only on feeding schedules or quick check-ins:",
      ],
      bullets: [
        "Interaction is real and responsive",
        "Attention is fully present",
        "Emotional bonds are formed",
      ],
    },
    howItWorks: {
      title: "How play visits work",
      bullets: [
        "Owners describe interaction needs",
        "Pet Friends match and visit",
        "Visits focus on engagement",
      ],
    },
    cta: {
      title: "Ready for companionship visits?",
      description: "Find Pet Friends who love focused play and quality time with pets.",
      primaryLabel: "Find Pet Friends for play visits",
      secondaryLabel: "View daycare and overnight options",
      secondaryHref: "/care/overnight-care",
    },
  },
];

export const CARE_TYPES = CARE_TYPE_LIST;

export const CARE_TYPE_SLUGS = CARE_TYPE_LIST.map((c) => c.slug);

export function getCareTypeBySlug(slug: string): CareTypeContent | undefined {
  return CARE_TYPE_LIST.find((c) => c.slug === slug);
}

export function getCareTypeCardSummary(care: CareTypeContent, locale: "en" | "et"): string {
  return locale === "et" ? care.cardSummary.et : care.cardSummary.en;
}
