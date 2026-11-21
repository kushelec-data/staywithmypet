import type { ReminderLocale } from "@/lib/profile-completion-reminders/types";

export type RoleSelectionCopy = {
  subject: string;
  preheader: string;
  greeting: string;
  intro: string[];
  howHeading: string;
  parentTitle: string;
  parentBody: string;
  friendTitle: string;
  friendBody: string;
  closer: string;
  cta: string;
  membership: string;
  tagline: string;
  signOff: string[];
};

const ET: RoleSelectionCopy = {
  subject: "🐾 Otsid lemmikule hoidjat või soovid ise loomasõbraks hakata?",
  preheader: "Oled juba liitunud! Vali nüüd oma roll ja avasta Stay With My Peti võimalused.",
  greeting: "Tere!",
  intro: [
    "Rõõm, et oled liitunud Stay With My Peti kogukonnaga! 💚",
    "Kas vajad vahel oma lemmikule usaldusväärset hoidjat või sooviksid hoopis ise mõne vahva neljajalgse sõbraga aega veeta?",
    "Stay With My Pet viib kokku loomaomanikud, kes vajavad aeg-ajalt oma lemmikule hoolivat hoidjat, ning loomasõbrad, kes soovivad loomadega aega veeta, kuid kellel endal ei pruugi lemmiklooma olla.",
  ],
  howHeading: "Kuidas sina sooviksid meie kogukonnas osaleda?",
  parentTitle: "🐶 Olen loomaomanik",
  parentBody:
    "Leia oma lemmikule usaldusväärne loomasõber, kes pakub talle seltsi, jalutuskäike või hoolt siis, kui sina seda teha ei saa.",
  friendTitle: "💚 Olen loomasõber",
  friendBody:
    "Naudi loomade seltskonda ka siis, kui sul endal lemmikut ei ole. Leia uusi neljajalgseid sõpru ja veeda nendega aega just sulle sobival viisil.",
  closer: "Sinu esimene samm on lihtne – vali oma roll ja alusta profiili loomist!",
  cta: "Alusta siin",
  membership:
    "Profiili loomine ja teiste kasutajate profiilide sirvimine on tasuta. Liikmelisust vajad alles siis, kui soovid kellegagi ühendust võtta ja lemmikuhoidu kokku leppida.",
  tagline: "Rohkem armastust ja vähem üksildust – nii lemmikutele kui ka inimestele! 🐾",
  signOff: ["Soojade tervitustega", "Stay With My Pet tiim", "staywithmypet.ee"],
};

const EN: RoleSelectionCopy = {
  subject: "🐾 Looking for pet care or want to become a Pet Friend?",
  preheader: "You've already joined! Choose your role and discover what Stay With My Pet has to offer.",
  greeting: "Hi!",
  intro: [
    "We're so happy you've joined the Stay With My Pet community! 💚",
    "Do you sometimes need someone trustworthy to care for your pet, or would you love to spend time with a wonderful four-legged friend?",
    "Stay With My Pet connects pet owners who occasionally need a caring helping hand with animal lovers who enjoy spending time with pets, even if they don't have one of their own.",
  ],
  howHeading: "How would you like to be part of our community?",
  parentTitle: "🐶 I'm a Pet Parent",
  parentBody:
    "Find a trustworthy Pet Friend who can offer your pet companionship, walks, or loving care whenever you need a helping hand.",
  friendTitle: "💚 I'm a Pet Friend",
  friendBody:
    "Enjoy the company of animals even if you don't have a pet of your own. Make new four-legged friends and spend time with them in a way that fits your lifestyle.",
  closer: "Your first step is simple – choose your role and start creating your profile!",
  cta: "Get Started",
  membership:
    "Creating your profile and browsing other users' profiles is completely free. You'll only need a membership when you're ready to connect with someone and arrange pet care.",
  tagline: "More love. Less loneliness. For pets and people. 🐾",
  signOff: ["Warm wishes,", "The Stay With My Pet Team", "staywithmypet.ee"],
};

export const ROLE_SELECTION_REMINDER_1_COPY: Record<ReminderLocale, RoleSelectionCopy> = {
  et: ET,
  en: EN,
};

export function roleSelectionReminder1Copy(locale: ReminderLocale): RoleSelectionCopy {
  return ROLE_SELECTION_REMINDER_1_COPY[locale] ?? ROLE_SELECTION_REMINDER_1_COPY.en;
}

export type RoleSelectionReminder2Copy = {
  subject: string;
  preheader: string;
  greeting: string;
  intro: string;
  question: string;
  closer: string;
  parentTitle: string;
  parentBody: string;
  friendTitle: string;
  friendBody: string;
  cta: string;
  membership: string;
  tagline: string;
  signOff: string[];
};

const ET2: RoleSelectionReminder2Copy = {
  subject: "🐾 Üks väike samm on veel jäänud!",
  preheader: "Oled juba liitunud! Vali oma roll ja avasta, mida Stay With My Pet sulle pakub.",
  greeting: "Tere!",
  intro: "Sa oled juba Stay With My Peti kogukonnaga liitunud, kuid üks väike samm on veel tegemata! 💚",
  question:
    "Kas soovid leida oma lemmikule usaldusväärse hoidja või hoopis ise mõne vahva neljajalgse sõbraga aega veeta?",
  closer: "Vali endale sobiv roll ja astu samm lähemale sellele, mida otsid!",
  parentTitle: "🐶 Loomaomanik",
  parentBody: "leia oma lemmikule hooliv loomasõber, kellele saad ta vajadusel usaldada.",
  friendTitle: "💚 Loomasõber",
  friendBody: "leia võimalusi veeta aega loomadega ja tuua oma päevadesse rohkem neljajalgset rõõmu.",
  cta: "Vali oma roll",
  membership: "Profiili loomine ja teiste kasutajate profiilide sirvimine on tasuta!",
  tagline: "Rohkem armastust ja vähem üksildust – nii lemmikutele kui ka inimestele! 🐾",
  signOff: ["Soojade tervitustega", "Stay With My Pet tiim", "staywithmypet.ee"],
};

const EN2: RoleSelectionReminder2Copy = {
  subject: "🐾 Just one small step left!",
  preheader: "You've already joined! Choose your role and discover what Stay With My Pet has to offer.",
  greeting: "Hi!",
  intro: "You've already joined the Stay With My Pet community, but there's still one small step to take! 💚",
  question:
    "Are you looking for someone trustworthy to care for your pet, or would you love to spend time with a wonderful four-legged friend?",
  closer: "Choose the role that suits you and take the next step towards what you're looking for!",
  parentTitle: "🐶 Pet Parent",
  parentBody: "find a caring Pet Friend you can trust with your beloved pet.",
  friendTitle: "💚 Pet Friend",
  friendBody: "discover opportunities to spend time with animals and bring more four-legged joy into your life.",
  cta: "Choose Your Role",
  membership: "Creating your profile and browsing other users' profiles is completely free!",
  tagline: "More love. Less loneliness. For pets and people. 🐾",
  signOff: ["Warm wishes,", "The Stay With My Pet Team", "staywithmypet.ee"],
};

export const ROLE_SELECTION_REMINDER_2_COPY: Record<ReminderLocale, RoleSelectionReminder2Copy> = {
  et: ET2,
  en: EN2,
};

export function roleSelectionReminder2Copy(locale: ReminderLocale): RoleSelectionReminder2Copy {
  return ROLE_SELECTION_REMINDER_2_COPY[locale] ?? ROLE_SELECTION_REMINDER_2_COPY.en;
}
