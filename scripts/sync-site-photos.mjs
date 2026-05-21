/**
 * Copies reference-old-site photos into public/images/*.
 * When Photo structure.xlsx is present, extend this script to read rows (non-article only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ref = path.join(root, "reference-old-site");
const pub = path.join(root, "public", "images");

const REF = {
  home: path.join(ref, "Home _ Stay With My Pet_files"),
  about: path.join(ref, "About _ Stay with my pet_files"),
  howItWorks: path.join(ref, "How It Works _ Stay with my pet_files"),
  searchPet: path.join(ref, "Search Pet _ Stay with my pet_files"),
  profile: path.join(ref, "Profile _ Stay with my pet_files"),
};

/** @type {{ src: string; dst: string }[]} */
const COPIES = [
  // Hero carousel (rows 1–5 — lifestyle stories)
  { src: `${REF.howItWorks}/how-it-works-meet-enjoy.jpg`, dst: "hero/story-1.jpg" },
  { src: `${REF.searchPet}/gerly-denny-6a04a6b3c9dd2.jpeg`, dst: "hero/story-2.jpg" },
  { src: path.join(pub, "pets", "buddy.jpg"), dst: "hero/story-3.jpg" },
  { src: `${REF.howItWorks}/how-it-works-descriptions-in-sections-for-pet-parents.jpg`, dst: "hero/story-4.jpg" },
  { src: `${REF.about}/about-us-our-mission-people-and-pets.JPG`, dst: "hero/story-5.jpg" },

  // About
  { src: `${REF.about}/about-us-our-mission-people-and-pets.JPG`, dst: "about/pet-community.jpg" },
  { src: `${REF.about}/about-us-our-story-founders-working-together.png`, dst: "about/founders-story.png" },

  // How it works page hero
  { src: `${REF.howItWorks}/how-it-works-browse-discover.jpg`, dst: "how-it-works/pet-care-steps.jpg" },
  { src: `${REF.howItWorks}/how-it-works-create-profile.jpg`, dst: "how-it-works/create-profile.jpg" },
  { src: `${REF.howItWorks}/how-it-works-connect-chat.jpg`, dst: "how-it-works/connect-chat.jpg" },
  { src: `${REF.howItWorks}/how-it-works-booking-request.jpg`, dst: "how-it-works/booking-request.jpg" },
  { src: `${REF.howItWorks}/how-it-works-meet-enjoy.jpg`, dst: "how-it-works/meet-enjoy.jpg" },
  { src: `${REF.howItWorks}/how-it-works-share-feedback.jpg`, dst: "how-it-works/share-feedback.jpg" },
  {
    src: `${REF.howItWorks}/how-it-works-descriptions-in-sections-for-pet-friends.jpg`,
    dst: "how-it-works/pet-friends-section.jpg",
  },
  {
    src: `${REF.howItWorks}/how-it-works-descriptions-in-sections-for-pet-parents.jpg`,
    dst: "how-it-works/pet-parents-section.jpg",
  },
  {
    src: `${REF.howItWorks}/how-it-works-descriptions-in-sections-tips-before-first-stay.jpg`,
    dst: "how-it-works/tips-first-stay.jpg",
  },

  // Explainer video scenes
  { src: `${REF.howItWorks}/how-it-works-browse-discover.jpg`, dst: "video/pet-cards.jpg" },
  { src: `${REF.howItWorks}/how-it-works-descriptions-in-sections-for-pet-friends.jpg`, dst: "video/happy-pet-friend.jpg" },
  { src: `${REF.howItWorks}/how-it-works-booking-request.jpg`, dst: "video/care-request.jpg" },
  { src: `${REF.howItWorks}/how-it-works-connect-chat.jpg`, dst: "video/chat.jpg" },
  { src: `${REF.howItWorks}/how-it-works-booking-request.jpg`, dst: "video/booking-calendar.jpg" },
  { src: `${REF.howItWorks}/how-it-works-share-feedback.jpg`, dst: "video/reviews.jpg" },
  { src: `${REF.howItWorks}/how-it-works-descriptions-in-sections-tips-before-first-stay.jpg`, dst: "video/new-city-dog.jpg" },

  // Profile / owner placeholders
  { src: `${REF.home}/omNXAO4qSbLs4wBNVo1BYVXfXsoGSNQVMeL0D4jp.jpg`, dst: "profiles/sarah.jpg" },
  { src: `${REF.home}/DU5vVWSolg6IGuch2zABMcPlOZyqKG1KPXaxQpCE.jpg`, dst: "profiles/james.jpg" },
  { src: `${REF.home}/eMmcZ9P98bfQWWyIeGGtuDSyI0Mgc2JaYvRUFeVl.jpg`, dst: "profiles/emily.jpg" },
  { src: `${REF.profile}/michael_suvo_198.jpeg`, dst: "profiles/alex.jpg" },
  { src: `${REF.searchPet}/gerly-denny-6a04a6b3c9dd2.jpeg`, dst: "profiles/maria.jpg" },
  { src: `${REF.about}/about-us-team-kush-portrait.jpg`, dst: "profiles/chris.jpg" },

  // Home / trust lifestyle
  { src: `${REF.howItWorks}/how-it-works-browse-discover.jpg`, dst: "trust/verified-community.jpg" },
  { src: `${REF.howItWorks}/how-it-works-descriptions-in-sections-for-pet-parents.jpg`, dst: "trust/real-homes-care.jpg" },
  { src: `${REF.howItWorks}/how-it-works-share-feedback.jpg`, dst: "trust/photo-updates.jpg" },
  { src: `${REF.howItWorks}/how-it-works-connect-chat.jpg`, dst: "trust/secure-messaging.jpg" },
  { src: `${REF.home}/eMmcZ9P98bfQWWyIeGGtuDSyI0Mgc2JaYvRUFeVl.jpg`, dst: "home/caregiver-emily.jpg" },
  { src: `${REF.home}/DU5vVWSolg6IGuch2zABMcPlOZyqKG1KPXaxQpCE.jpg`, dst: "home/caregiver-josefh.jpg" },
  { src: `${REF.home}/omNXAO4qSbLs4wBNVo1BYVXfXsoGSNQVMeL0D4jp.jpg`, dst: "home/caregiver-sarah.jpg" },

  // Generic placeholders (from existing pet library)
  { src: path.join(pub, "pets", "luna.jpg"), dst: "placeholders/default-pet.jpg" },
  { src: path.join(pub, "profiles", "sarah.jpg"), dst: "placeholders/default-profile.jpg" },
];

const FOLDERS = ["hero", "home", "about", "how-it-works", "placeholders", "profiles", "pets", "trust", "video"];

for (const folder of FOLDERS) {
  fs.mkdirSync(path.join(pub, folder), { recursive: true });
}

let copied = 0;
const missing = [];

for (const { src, dst } of COPIES) {
  const destPath = path.join(pub, dst);
  if (!fs.existsSync(src)) {
    missing.push(src);
    continue;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(src, destPath);
  copied += 1;
}

console.log(`Copied ${copied} files into public/images/`);
if (missing.length) {
  console.log(`Missing ${missing.length} sources:`);
  for (const m of missing) console.log("  -", m);
}
