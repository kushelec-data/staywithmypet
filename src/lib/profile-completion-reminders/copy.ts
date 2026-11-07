import type { ReminderEmailRole, ReminderLocale, ReminderTemplateStage } from "./types";

export type ReminderBenefit = {
  emoji: string;
  title: string;
  rest: string;
};

export type ReminderCopy = {
  subject: string;
  preheader: string;
  heading: string;
  intro: string[];
  whyHeading: string;
  benefits: ReminderBenefit[];
  closer: string;
  cta: string;
  membership: string;
  tagline: string;
  signOff: string[];
};

const PARENT_ET_DAY5: ReminderCopy = {
  subject: "🐾 Sinu lemmiku uus sõber on vaid ühe sammu kaugusel!",
  preheader: "Leia oma lemmikule hooliv hoidja, kellele saad ta südamerahuga usaldada.",
  heading: "🐾 Sinu lemmiku uus sõber on vaid ühe sammu kaugusel!",
  intro: [
    "Vahel tuleb ette päevi, mil tööpäev venib pikaks, ees ootab reis või lihtsalt ei jõua kõike korraga. Oleks ju hea teada, et sinu lemmikul on keegi, kes talle sel ajal seltsi ja hoolt pakub? 🐶💚",
    "Sa oled juba teinud esimese sammu ja liitunud Stay With My Petiga. Nüüd on jäänud veel üks väike samm, et saaksid hakata oma lemmikule sobivat loomasõpra otsima.",
  ],
  whyHeading: "Miks tasub profiil lõpuni täita?",
  benefits: [
    {
      emoji: "🐾",
      title: "Leia sobiv loomasõber.",
      rest: "Sinu lemmiku vajadused ja harjumused aitavad leida inimese, kellega ta võiks hästi sobida.",
    },
    {
      emoji: "💚",
      title: "Loo usaldust juba enne esimest kohtumist.",
      rest: "Põhjalik profiil aitab loomasõbral sinu lemmikut paremini tundma õppida.",
    },
    {
      emoji: "🏡",
      title: "Ole valmis selleks hetkeks, kui abi vajad.",
      rest: "Kui profiil on valmis, saad sobiva loomasõbra otsimisega kohe edasi liikuda.",
    },
  ],
  closer: "Sinu profiil on juba alustatud – tule lõpeta see ära!",
  cta: "Täida oma profiil lõpuni",
  membership:
    "Ja pea meeles – profiili loomine ja loomasõpradega tutvumine on tasuta. Liikmelisust vajad alles siis, kui soovid ühendust võtta ja hoidu kokku leppida.",
  tagline: "Rohkem armastust ja vähem üksildust – nii lemmikutele kui ka inimestele! 🐾",
  signOff: ["Soojade tervitustega", "Stay With My Pet tiim", "staywithmypet.ee"],
};

const PARENT_EN_DAY5: ReminderCopy = {
  subject: "🐾 Your pet\u2019s new best friend could be just a few steps away!",
  preheader: "Find a caring Pet Friend you can trust with your beloved pet.",
  heading: "🐾 Your pet\u2019s new best friend could be just a few steps away!",
  intro: [
    "Some days, work runs late, travel plans come up, or life simply gets a little too busy. Wouldn't it be wonderful to know there's someone who can give your pet the love, attention, and care they deserve when you can't be there? 🐶💚",
    "You've already taken the first step by joining Stay With My Pet. Now there's just one more step before you can start looking for the perfect Pet Friend for your furry companion!",
  ],
  whyHeading: "Why complete your profile?",
  benefits: [
    {
      emoji: "🐾",
      title: "Find the right Pet Friend.",
      rest: "Sharing your pet's needs, personality, and daily routines helps you find someone who's a great match.",
    },
    {
      emoji: "💚",
      title: "Build trust from the very beginning.",
      rest: "A detailed profile helps potential Pet Friends get to know your pet before you even meet.",
    },
    {
      emoji: "🏡",
      title: "Be ready whenever you need a helping hand.",
      rest: "With your profile complete, you'll be ready to start finding a caring Pet Friend when the need arises.",
    },
  ],
  closer: "You've already started your profile – why not finish it today?",
  cta: "Complete Your Profile",
  membership:
    "And remember, creating your profile and browsing Pet Friends is completely free! You'll only need a membership when you're ready to connect and arrange pet care.",
  tagline: "More love. Less loneliness. For pets and people. 🐾",
  signOff: ["Warm wishes,", "The Stay With My Pet Team", "staywithmypet.ee"],
};

const FRIEND_ET_DAY5: ReminderCopy = {
  subject: "💚 Sinu järgmine neljajalgne sõber võib sind juba oodata!",
  preheader: "Naudi loomade seltskonda ja leia uusi neljajalgseid sõpru!",
  heading: "💚 Sinu järgmine neljajalgne sõber võib sind juba oodata!",
  intro: [
    "Kujuta ette, et sinu järgmine jalutuskäik oleks koos rõõmsa koeraga. Või et saaksid veeta ühe mõnusa pärastlõuna kassiga, kes hea meelega sinu kõrval nurruks. 🐶🐱",
    "Stay With My Petiga saad nautida loomade seltskonda ka siis, kui sul endal lemmiklooma ei ole.",
    "Sa oled juba meie kogukonnaga liitunud, aga sinu profiil ootab veel lõpetamist!",
  ],
  whyHeading: "Miks tasub profiil lõpuni täita?",
  benefits: [
    {
      emoji: "🐾",
      title: "Leia endale uus neljajalgne sõber.",
      rest: "Anna teada, milliste loomadega sooviksid aega veeta ja millist hoolt saad pakkuda.",
    },
    {
      emoji: "💚",
      title: "Aita loomaomanikel sind tundma õppida.",
      rest: "Sinu kogemused, eelistused ja tutvustus aitavad neil mõista, miks võiksid just sina nende lemmikule sobida.",
    },
    {
      emoji: "🌿",
      title: "Veeda aega loomadega endale sobival viisil.",
      rest: "Olgu selleks jalutuskäigud, mängimine või lihtsalt seltsi pakkumine – sina valid, mida ja millal teha soovid.",
    },
  ],
  closer: "Ära jäta oma järgmist vahvat kohtumist juhuse hooleks!",
  cta: "Täida oma profiil lõpuni",
  membership:
    "Profiili loomine ja lemmikutega tutvumine on tasuta. Liikmelisust vajad alles siis, kui soovid loomaomanikuga ühendust võtta ja hoidu kokku leppida.",
  tagline: "Rohkem armastust ja vähem üksildust – nii lemmikutele kui ka inimestele! 🐾",
  signOff: ["Soojade tervitustega", "Stay With My Pet tiim", "staywithmypet.ee"],
};

const FRIEND_EN_DAY5: ReminderCopy = {
  subject: "💚 A four-legged friend could be waiting for you!",
  preheader: "Enjoy the company of animals and make new four-legged friends!",
  heading: "💚 A four-legged friend could be waiting for you!",
  intro: [
    "Imagine your next walk with a happy dog by your side. Or spending a cozy afternoon with a cat happily purring next to you. 🐶🐱",
    "With Stay With My Pet, you can enjoy the companionship of animals even if you don't have a pet of your own.",
    "You've already joined our community, but your profile is still waiting to be completed!",
  ],
  whyHeading: "Why complete your profile?",
  benefits: [
    {
      emoji: "🐾",
      title: "Meet your next four-legged friend.",
      rest: "Let Pet Parents know which animals you'd love to spend time with and what kind of care you're happy to offer.",
    },
    {
      emoji: "💚",
      title: "Help Pet Parents get to know you.",
      rest: "Your experience, preferences, and personal introduction help them understand why you could be a wonderful match for their pet.",
    },
    {
      emoji: "🌿",
      title: "Enjoy time with animals on your own terms.",
      rest: "Whether it's going for walks, playing, or simply keeping them company, you decide what you'd like to do and when you're available.",
    },
  ],
  closer: "Don't leave your next wonderful pet friendship to chance!",
  cta: "Complete Your Profile",
  membership:
    "Creating your profile and browsing pets is completely free! You'll only need a membership when you're ready to connect with Pet Parents and arrange pet care.",
  tagline: "More love. Less loneliness. For pets and people. 🐾",
  signOff: ["Warm wishes,", "The Stay With My Pet Team", "staywithmypet.ee"],
};

/** Shorter second reminders. Drafts for review — sending stays gated until approved. */
const PARENT_ET_DAY10: ReminderCopy = {
  subject: "🐾 Sinu profiil ootab veel üht viimast sammu",
  preheader: "Lõpeta profiil, et saaksid oma lemmikule loomasõpra otsida.",
  heading: "🐾 Sinu profiil ootab veel üht viimast sammu",
  intro: [
    "Sinu Stay With My Pet profiil on veel pooleli. Kui see on valmis, saad hakata otsima hoolivat loomasõpra, kellele oma lemmiku südamerahuga usaldada.",
  ],
  whyHeading: "",
  benefits: [],
  closer: "",
  cta: "Täida oma profiil lõpuni",
  membership: "",
  tagline: "",
  signOff: ["Soojade tervitustega", "Stay With My Pet tiim", "staywithmypet.ee"],
};

const PARENT_EN_DAY10: ReminderCopy = {
  subject: "🐾 Your profile is still one step away",
  preheader: "Finish your profile so you can start looking for a Pet Friend.",
  heading: "🐾 Your profile is still one step away",
  intro: [
    "Your Stay With My Pet profile is still unfinished. Once it is complete, you can start finding a caring Pet Friend you can trust with your beloved pet.",
  ],
  whyHeading: "",
  benefits: [],
  closer: "",
  cta: "Complete Your Profile",
  membership: "",
  tagline: "",
  signOff: ["Warm wishes,", "The Stay With My Pet Team", "staywithmypet.ee"],
};

const FRIEND_ET_DAY10: ReminderCopy = {
  subject: "💚 Sinu profiil ootab, et saaksid uue sõbra leida",
  preheader: "Lõpeta profiil ja naudi loomade seltskonda.",
  heading: "💚 Sinu profiil ootab, et saaksid uue sõbra leida",
  intro: [
    "Sinu profiil on veel lõpetamata. Anna loomaomanikele teada, millist hoolt saad pakkuda – nii leiad kiiremini uue neljajalgse sõbra.",
  ],
  whyHeading: "",
  benefits: [],
  closer: "",
  cta: "Täida oma profiil lõpuni",
  membership: "",
  tagline: "",
  signOff: ["Soojade tervitustega", "Stay With My Pet tiim", "staywithmypet.ee"],
};

const FRIEND_EN_DAY10: ReminderCopy = {
  subject: "💚 Your next four-legged friend is still waiting",
  preheader: "Finish your profile and enjoy time with animals.",
  heading: "💚 Your next four-legged friend is still waiting",
  intro: [
    "Your profile is still unfinished. Tell Pet Parents which animals you'd love to spend time with so you can meet your next four-legged friend.",
  ],
  whyHeading: "",
  benefits: [],
  closer: "",
  cta: "Complete Your Profile",
  membership: "",
  tagline: "",
  signOff: ["Warm wishes,", "The Stay With My Pet Team", "staywithmypet.ee"],
};

const COPY: Record<ReminderTemplateStage, Record<ReminderEmailRole, Record<ReminderLocale, ReminderCopy>>> = {
  day_5: {
    pet_parent: { et: PARENT_ET_DAY5, en: PARENT_EN_DAY5 },
    pet_friend: { et: FRIEND_ET_DAY5, en: FRIEND_EN_DAY5 },
  },
  day_10: {
    pet_parent: { et: PARENT_ET_DAY10, en: PARENT_EN_DAY10 },
    pet_friend: { et: FRIEND_ET_DAY10, en: FRIEND_EN_DAY10 },
  },
};

export function profileReminderCopy(
  stage: ReminderTemplateStage,
  role: ReminderEmailRole,
  locale: ReminderLocale,
): ReminderCopy {
  return COPY[stage][role][locale];
}

export const DAY5_COPY = COPY.day_5;
export const DAY10_DRAFTS = COPY.day_10;
