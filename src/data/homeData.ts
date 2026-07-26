export const heroContent = {
  title: "Responsible pet sharing for Pet Parents and Pet Friends",
  subtitle:
    "Pet Parents own the pet and list care when they need help. Pet Friends borrow time for walks, visits, and companionship — all in one trusted community.",
} as const;

export const servicesContent = {
  title: "Flexible care, built around your pet",
  subtitle:
    "From walks and home visits to daycare and overnight stays — choose safe, home-based pet care that fits your pet's routine.",
  services: [
    {
      title: "Daycare",
      description: "Daytime companionship that feels like a second home, not a facility.",
      icon: "🏠",
    },
    {
      title: "Walks",
      description: "Reliable walks that fit your pet's routine – even when your day doesn't.",
      icon: "🦮",
    },
    {
      title: "Overnight care",
      description: "Loving, overnight care when your pet needs a home — not a hotel.",
      icon: "🌙",
    },
    {
      title: "Home Visits",
      description: "Care for your pet in the comfort of their own home.",
      icon: "💚",
    },
    {
      title: "Feeding only",
      description: "Simple, reliable feeding when that's all your pet needs.",
      icon: "🍽️",
    },
    {
      title: "Play visits",
      description: "Short visits focused on play, attention, and emotional connection.",
      icon: "🎾",
    },
  ],
} as const;

export const whyChooseUsContent = {
  eyebrow: "Why Choose Stay With My Pet",
  title: "Designed for Real-Life Pet Sharing",
  subtitle:
    "A fair, flexible platform built for people who care about animals — without pressure, transactions, or rigid rules.",
  cards: [
    {
      title: "Flexible Roles",
      description:
        "You can join as a Pet Parent, a Pet Friend — or both. Switch roles freely as your life, needs, or availability change.",
      icon: "🔄",
    },
    {
      title: "No Money Between Users",
      description:
        "Pet Parents and Pet Friends never pay each other. All payments are handled through platform access — keeping care ethical and pressure-free.",
      icon: "🤝",
    },
    {
      title: "Shared Care Agreements",
      description:
        "Before every booking, expectations are discussed openly. Routines, boundaries, and responsibilities are clear from the start.",
      icon: "📋",
    },
    {
      title: "Care Without Burnout",
      description:
        "Unlike gig platforms, we don't encourage overbooking. Our model supports mindful sharing that respects pets' wellbeing and people's time.",
      icon: "💛",
    },
  ],
} as const;

export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
  badgeLabel?: string;
};

export const pricingContent = {
  title: "Membership & Pricing",
  subtitle:
    "Create an account, browse pets and pet friends, and create listings for free. Upgrade only when you're ready to message or make bookings.",
  tabs: [
    { id: "owner" as const, label: "Pet Parent" },
    { id: "friend" as const, label: "Pet Friend" },
  ],
  petParentPlans: [
    {
      id: "one-time-owner",
      name: "One Time",
      price: "€18",
      features: [
        "Valid for one care arrangement",
        "Book within 7 days of purchase",
        "Unlock messaging for your confirmed care arrangement",
        "No refund if unused within 7 days",
        "If the care arrangement is cancelled, access is restored for one month",
        "Leave and receive reviews after care",
      ],
    },
    {
      id: "3-month-owner",
      name: "3 Month",
      price: "€79",
      popular: true,
      badgeLabel: "Most Practical for Recurring Needs",
      features: [
        "Unlimited bookings for 3 months",
        "Flexible booking lengths — short or long stays",
        "Unlimited messaging with matched users",
        "Leave and receive reviews",
        "Perfect for travel periods or recurring help",
      ],
    },
    {
      id: "1-year-owner",
      name: "1 Year",
      price: "€249",
      features: [
        "Unlimited bookings for 12 months",
        "Unlimited messaging and connections",
        "Ideal for long-term flexibility and peace of mind",
        "Build trusted relationships through reviews",
        "Best value for regular users",
      ],
    },
  ] satisfies PricingPlan[],
  petFriendPlans: [
    {
      id: "one-time-friend",
      name: "One Time",
      price: "€12",
      features: [
        "Valid for one care arrangement",
        "Book within 7 days of purchase",
        "Unlock messaging for your confirmed care arrangement",
        "No refund if unused within 7 days",
        "If the care arrangement is cancelled, access is restored for one month",
        "Leave and receive reviews after care",
      ],
    },
    {
      id: "3-month-friend",
      name: "3 Month",
      price: "€49",
      popular: true,
      badgeLabel: "Most Practical for Recurring Needs",
      features: [
        "Unlimited bookings for 3 months",
        "Flexible booking lengths — short or long stays",
        "Unlimited messaging with matched users",
        "Leave and receive reviews",
        "Perfect for travel periods or recurring help",
      ],
    },
    {
      id: "1-year-friend",
      name: "1 Year",
      price: "€119",
      features: [
        "Unlimited bookings for 12 months",
        "Unlimited messaging and connections",
        "Ideal for long-term flexibility and peace of mind",
        "Build trusted relationships through reviews",
        "Best value for regular users",
      ],
    },
  ] satisfies PricingPlan[],
} as const;

export const faqContent = {
  title: "Frequently Asked Questions",
  subtitle: "Everything you need to know before getting started.",
  items: [
    {
      question: "What is Stay With My Pet?",
      answer:
        "Stay With My Pet is a community-based pet-sharing platform. We bring together Pet Parents (pet owners who sometimes need help with care or companionship) and Pet Friends (responsible animal lovers who want to spend time with pets temporarily). Our mission is simple — More love. Less loneliness. For pets and people.",
    },
    {
      question: "How does Stay With My Pet work?",
      answer:
        "The platform makes pet sharing simple, flexible, and transparent: Pet Parents create a profile for themselves and their pet, describing routines, needs, and personality. Pet Friends create a profile sharing their experience, lifestyle, and availability. Users can browse profiles freely. With a paid membership, users can send booking requests, communicate, and confirm care arrangements. All care details are agreed directly between the Pet Parent and the Pet Friend.",
    },
    {
      question: "Who can join Stay With My Pet?",
      answer:
        "Anyone aged 18 or older who loves animals and is committed to their well-being can join. Our community includes pet owners who need reliable help during travel or busy periods, families and students who want pet companionship, and people who cannot own pets permanently due to lifestyle, allergies, or financial reasons.",
    },
  ],
} as const;
