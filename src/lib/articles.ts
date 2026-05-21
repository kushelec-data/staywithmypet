export type ArticleCategory =
  | "Pet care"
  | "Trust & safety"
  | "Pet Friend tips"
  | "Pet Parent tips";

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  publishedAt: string;
  readTimeMinutes: number;
  imageSrc: string;
  imageAlt: string;
  body: ArticleBlock[];
};

const IMAGE_BASE = "/images/article";

const RAW_ARTICLES: Omit<Article, "readTimeMinutes">[] = [
  {
    slug: "building-trust-as-a-pet-friend",
    title: "Building Trust as a Pet Friend",
    excerpt:
      "First meetings set the tone. Calm confidence, respect for space, and consistent routines help pets feel safe with someone new.",
    category: "Pet Friend tips",
    publishedAt: "January 23, 2026",
    imageSrc: `${IMAGE_BASE}/article-building-trust-training-dog-in-park.jpg`,
    imageAlt:
      "Person spending focused time training and bonding with a dog in a park",
    body: [
      {
        type: "p",
        text: "You're more than just a pet sitter — you're a friend. When meeting a pet for the first time, your energy matters. Animals sense emotions quickly, so calm confidence helps them feel safe.",
      },
      { type: "h2", text: "Tips to build trust quickly" },
      {
        type: "ul",
        items: [
          "Stay calm and move slowly. Sudden movements can scare shy animals.",
          "Use their name softly. Hearing their name from a new person helps create familiarity.",
          "Respect their space. Let them come to you instead of reaching out too soon.",
          "Learn their routines. Ask the Pet Parent about feeding times, walks, and play habits — and stick to them.",
          "Offer gentle affection. Every pet has its comfort level — watch how they respond.",
        ],
      },
      {
        type: "p",
        text: "A trustworthy Pet Friend makes the pet's world bigger and happier. Patience, kindness, and consistency are the best tools you can bring.",
      },
    ],
  },
  {
    slug: "understanding-pet-body-language",
    title: "Understanding Pet Body Language",
    excerpt:
      "Learn to read stress, comfort, and play signals so you can respond with confidence and keep every interaction safe.",
    category: "Trust & safety",
    publishedAt: "January 23, 2026",
    imageSrc: `${IMAGE_BASE}/article-understanding-pet-body-language-child-with-cat.jpg`,
    imageAlt: "Cat resting calmly beside a child on a sofa at home",
    body: [
      {
        type: "p",
        text: "Animals \"talk\" — just not in words. Learning to read your pet's signals helps prevent stress, misunderstandings, and even accidents.",
      },
      { type: "h2", text: "Common signs to look for" },
      {
        type: "ul",
        items: [
          "Relaxed pet: loose body, slow tail wag (dog), upright ears, normal breathing.",
          "Stressed pet: tucked tail, flattened ears, dilated pupils, trembling, yawning, or licking lips excessively.",
          "Happy pet: playful jumps, gentle eye contact, relaxed mouth, slow blinking (in cats).",
        ],
      },
      { type: "h3", text: "Pro tip" },
      {
        type: "p",
        text: "Every pet is unique. Take time to notice what \"normal\" looks like for yours, so you can quickly tell when something's off.",
      },
      {
        type: "p",
        text: "Understanding your pet's language is the foundation of every strong bond — for both Pet Parents and Pet Friends.",
      },
    ],
  },
  {
    slug: "pet-routines-that-keep-everyone-happy",
    title: "Pet Routines That Keep Everyone Happy",
    excerpt:
      "Consistency is key to comfort. Tips for smooth feeding, walks, rest, and familiar commands while caring for a pet.",
    category: "Pet care",
    publishedAt: "January 23, 2026",
    imageSrc: `${IMAGE_BASE}/article-pet-routines-cat-on-lap-while-working.jpg`,
    imageAlt: "Person on a sofa with a cat on their lap while working from home",
    body: [
      {
        type: "p",
        text: "Consistency is key to comfort. Pets thrive on routine — it gives them a sense of safety. When their schedule changes, they can feel confused or anxious.",
      },
      { type: "h2", text: "Tips for smooth routines" },
      {
        type: "ul",
        items: [
          "Keep feeding times regular. Sudden changes can upset digestion.",
          "Exercise daily. Walks, playtime, or enrichment toys help release energy.",
          "Quiet time matters too. Balance activity with rest, especially for older pets.",
          "Stick to familiar commands. Ask Pet Parents what words or signals their pet knows.",
        ],
      },
      {
        type: "p",
        text: "When a Pet Friend follows the same structure as the Pet Parent, the animal adjusts easily — and the whole experience feels calm and joyful for everyone.",
      },
    ],
  },
  {
    slug: "prepare-your-home-for-a-visiting-pet",
    title: "Prepare Your Home for a Visiting Pet",
    excerpt:
      "Make your space safe, calm, and welcoming before a visiting pet arrives — a little preparation goes a long way.",
    category: "Pet care",
    publishedAt: "January 23, 2026",
    imageSrc: `${IMAGE_BASE}/article-preparing-home-for-visiting-pet.jpg`,
    imageAlt: "Person preparing their home for a visiting pet",
    body: [
      { type: "h2", text: "Make your space safe, calm, and welcoming" },
      {
        type: "p",
        text: "Welcoming a visiting pet into your home is an exciting experience — and a little preparation goes a long way. While the pet owner will provide everything your guest needs, creating a safe and comfortable environment helps the animal settle in more easily.",
      },
      {
        type: "p",
        text: "Preparing your home isn't about perfection — it's about care, awareness, and readiness to adapt to another living being's needs.",
      },
      { type: "h2", text: "Before the pet arrives, take a moment to prepare" },
      { type: "h3", text: "Remove potential hazards" },
      {
        type: "p",
        text: "Walk through your space with curious paws in mind. Put away fragile objects, secure loose cables, and remove or block access to anything that could be harmful — including toxic plants, cleaning supplies, medications, or small objects that could be swallowed.",
      },
      { type: "h3", text: "Designate a calm resting area" },
      {
        type: "p",
        text: "The pet will arrive with their own familiar items, such as a bed, blanket, bowls, and toys. Choose a quiet, comfortable spot where these can be placed — a space where the pet can rest, feel safe, and take breaks from stimulation when needed.",
      },
      { type: "h3", text: "Secure windows, balconies, and doors" },
      {
        type: "p",
        text: "Make sure all windows, balconies, and exits are properly secured. Even calm or indoor-only pets can act unpredictably in a new environment, so extra caution helps prevent accidents.",
      },
      { type: "h3", text: "Keep human food safely stored" },
      {
        type: "p",
        text: "Many everyday foods can be dangerous for pets. Store food out of reach and avoid leaving items like chocolate, grapes, cooked bones, or leftovers unattended.",
      },
      { type: "h3", text: "Align with everyone in the household" },
      {
        type: "p",
        text: "Make sure all household members are aware of the visiting pet and understand the basic rules — where the pet is allowed, how to interact with them, and when to give them space. Consistency helps the pet feel secure.",
      },
      { type: "h2", text: "Why preparation matters" },
      {
        type: "p",
        text: "A thoughtfully prepared home reduces stress for the pet, prevents accidents, and builds trust between you and the pet owner — helping create a calm, positive experience for everyone involved.",
      },
    ],
  },
  {
    slug: "what-to-do-if-a-pet-gets-homesick",
    title: "What to Do If a Pet Gets Homesick",
    excerpt:
      "It's normal — and fixable. Gentle routines and patience help pets settle when staying somewhere new.",
    category: "Pet care",
    publishedAt: "January 23, 2026",
    imageSrc: `${IMAGE_BASE}/article-comforting-pet-feeling-homesick.jpg`,
    imageAlt: "Person offering comfort to a pet that may be feeling homesick",
    body: [
      {
        type: "p",
        text: "It's normal — and it's fixable. Even the happiest pets can miss their owners when staying somewhere new. Some may eat less, look sad, or stay quiet during the first days.",
      },
      { type: "h2", text: "Here's how you can help" },
      {
        type: "ul",
        items: [
          "Keep familiar smells — a blanket or toy from home helps a lot.",
          "Stick to familiar routines — same feeding and walk times.",
          "Offer gentle comfort, but don't force cuddles. Let the pet approach you.",
          "Play and talk softly — connection grows through small, positive moments.",
        ],
      },
      {
        type: "p",
        text: "Homesickness usually fades within a couple of days as trust grows. Patience, warmth, and routine will make your guest feel safe and loved.",
      },
    ],
  },
  {
    slug: "emergency-basics-every-pet-friend-should-know",
    title: "Emergency Basics Every Pet Friend Should Know",
    excerpt:
      "Preparation brings peace of mind. Know the vet, medications, and what to do if something unexpected happens.",
    category: "Trust & safety",
    publishedAt: "January 23, 2026",
    imageSrc: `${IMAGE_BASE}/article-pet-emergency-vet-visit.jpg`,
    imageAlt: "Veterinarian examining a dog during a check-up or emergency visit",
    body: [
      {
        type: "p",
        text: "Preparation brings peace of mind. Accidents are rare, but knowing what to do helps you stay calm and act fast.",
      },
      { type: "h2", text: "Know this before you start" },
      {
        type: "ul",
        items: [
          "The pet's vet name, address, and phone number.",
          "Any medications or allergies.",
          "The Pet Parent's contact details and preferred emergency plan.",
        ],
      },
      { type: "h2", text: "If something happens" },
      {
        type: "ol",
        items: [
          "Stay calm — animals sense panic.",
          "Call the Pet Parent immediately.",
          "If needed, go to the nearest vet (have the address saved).",
          "Keep the pet warm and quiet until help arrives.",
        ],
      },
      {
        type: "p",
        text: "Being ready doesn't mean expecting trouble — it means caring responsibly.",
      },
    ],
  },
  {
    slug: "choose-the-right-pet-friend",
    title: "Choose the Right Pet Friend",
    excerpt:
      "Every pet is unique. Find someone whose lifestyle, availability, and approach to care align with your dog or cat.",
    category: "Pet Parent tips",
    publishedAt: "September 9, 2025",
    imageSrc: `${IMAGE_BASE}/article-choosing-pet-friend-working-from-home-with-dog.jpg`,
    imageAlt: "Person working from home with a dog resting calmly nearby",
    body: [
      { type: "h2", text: "Why a thoughtful choice matters" },
      {
        type: "p",
        text: "Every pet is unique, with their own personality, routines, and needs. When choosing a temporary caregiver or companion for your dog or cat, it's essential to find someone whose lifestyle, mindset, and approach to animal care align with your pet's needs.",
      },
      { type: "h2", text: "What to look for in a pet friend" },
      { type: "h3", text: "Willingness to commit and take responsibility" },
      {
        type: "p",
        text: "Previous experience can be helpful, but what matters most is a genuine desire to care, learn, and take responsibility for your pet's well-being. A caring attitude, openness to guidance, and readiness to learn are often far more important than years of experience.",
      },
      { type: "h3", text: "Time and availability" },
      {
        type: "p",
        text: "Does the pet friend have enough time to dedicate to your pet? Whether it's walks, playtime, feeding, or simply being present, consistent attention is essential for your pet's happiness and sense of security.",
      },
      { type: "h3", text: "Home environment" },
      {
        type: "p",
        text: "Is the environment safe and suitable for your pet? A calm, secure space without hazards and with enough room to move or rest comfortably is key to helping your dog or cat feel at ease.",
      },
      { type: "h3", text: "Personality compatibility" },
      {
        type: "p",
        text: "Not every person is a perfect match for every pet — and that's okay. Some people enjoy energetic dogs and long walks, while others prefer calm cats or quieter animals. The goal is for both the pet and the pet friend to feel comfortable together.",
      },
      { type: "h2", text: "Trust and communication" },
      {
        type: "p",
        text: "Before entrusting your pet to someone else, meeting and communicating openly is essential. Discuss daily routines, feeding schedules, habits, and any health-related needs. Clear and honest communication builds trust and helps prevent misunderstandings.",
      },
      { type: "h2", text: "The value of the right match" },
      {
        type: "p",
        text: "A well-chosen pet friend ensures your pet feels safe, cared for, and understood. As a pet owner, you gain peace of mind knowing your pet is in good hands. The pet friend, in turn, gains a meaningful experience, companionship, and the opportunity to grow as a responsible and caring caregiver.",
      },
    ],
  },
  {
    slug: "borrowing-a-dog-what-you-need-to-know",
    title: "Borrowing a Dog: What You Need to Know",
    excerpt:
      "Borrowing a dog can be joyful and meaningful — if you're ready for daily care, routines, and responsibility.",
    category: "Pet Friend tips",
    publishedAt: "January 23, 2026",
    imageSrc: `${IMAGE_BASE}/article-borrowing-a-dog-puppy-resting-on-sofa.jpg`,
    imageAlt: "Young dog resting comfortably on a sofa at home",
    body: [
      { type: "h2", text: "Not just fun and games" },
      {
        type: "p",
        text: "Borrowing a dog can be a dream come true for many who love animals but can't have their own. Still, it comes with responsibility. Dogs are living beings with daily needs and emotions.",
      },
      { type: "h2", text: "Questions to ask yourself before borrowing a dog" },
      {
        type: "ul",
        items: [
          "Am I ready to walk the dog daily, regardless of the weather?",
          "Do I have time to play and bond with the dog?",
          "Can I handle basic care, like feeding and cleaning?",
          "Do I know how to respond if the dog gets sick or scared?",
        ],
      },
      { type: "h2", text: "Practical preparation" },
      {
        type: "p",
        text: "Before borrowing a dog, it's important to meet them with their owner. Discuss routines, food preferences, and behavioural traits. Agree on how to act in case of an emergency.",
      },
      { type: "h2", text: "The emotional reward" },
      {
        type: "p",
        text: "Borrowing a dog offers a sense of companionship, joy, and movement. At the same time, it's an opportunity to experience what pet ownership really entails — helping people decide whether they are ready for a permanent commitment.",
      },
    ],
  },
  {
    slug: "introduce-your-pet-to-new-pet-friend-safely",
    title: "Introduce Your Pet to a New Pet Friend Safely",
    excerpt:
      "Smooth introductions make happy experiences. A step-by-step approach helps dogs, cats, and smaller pets feel safe.",
    category: "Pet Parent tips",
    publishedAt: "January 23, 2026",
    imageSrc: `${IMAGE_BASE}/article-introducing-dog-to-new-pet-friend.jpg`,
    imageAlt: "Woman greeting and meeting a dog during a calm introduction",
    body: [
      { type: "h2", text: "Smooth introductions make happy experiences" },
      {
        type: "p",
        text: "Meeting a new person can be exciting — or stressful — for a pet. Whether it's a dog, cat, or rabbit, first impressions matter. To make sure your furry friend feels safe and your Pet Friend has a positive experience, take it slow.",
      },
      { type: "h2", text: "Step-by-step approach" },
      {
        type: "ol",
        items: [
          "Meet in a neutral place — for dogs, start outdoors (a quiet park or yard). For cats or smaller pets, choose a calm room.",
          "Keep it short and positive — don't overwhelm your pet. A few minutes of friendly interaction is enough at first.",
          "Observe body language — wagging tails, relaxed posture, or gentle sniffing are good signs. Hiding, hissing, staying quiet, or growling means your pet needs more time.",
          "Reward calm behaviour — treats and praise help your pet associate the new person with good experiences.",
        ],
      },
      {
        type: "p",
        text: "Remember, trust takes time. Let your pet set the pace — and soon enough, they'll welcome their new friend with excitement.",
      },
    ],
  },
];

function blocksToPlainText(blocks: ArticleBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "p" || block.type === "h2" || block.type === "h3") return block.text;
      return block.items.join(" ");
    })
    .join(" ");
}

function estimateReadTimeMinutes(blocks: ArticleBlock[]): number {
  const words = blocksToPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export const ARTICLES: Article[] = RAW_ARTICLES.map((article) => ({
  ...article,
  readTimeMinutes: estimateReadTimeMinutes(article.body),
}));

export function formatReadTime(minutes: number): string {
  return `${minutes} min read`;
}

export function getAllArticles(): Article[] {
  return ARTICLES;
}

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

export function getRelatedArticles(slug: string, limit = 3): Article[] {
  const current = getArticleBySlug(slug);
  if (!current) return ARTICLES.slice(0, limit);

  const others = ARTICLES.filter((article) => article.slug !== slug);
  const sameCategory = others.filter((article) => article.category === current.category);
  const related: Article[] = [...sameCategory];
  for (const article of others) {
    if (related.length >= limit) break;
    if (!related.some((item) => item.slug === article.slug)) {
      related.push(article);
    }
  }
  return related.slice(0, limit);
}
