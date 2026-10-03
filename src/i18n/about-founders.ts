/**
 * Founder role + bio from EST and ENG texts.xlsx → Our Story sheet (rows 29–35).
 * Synced into generated/site-en.ts and generated/site-et.ts via scripts/sync-site-texts.mjs.
 * Denny is appended here so Excel sync cannot drop him from the About team.
 */
import { siteEnPartial } from "./generated/site-en";
import { siteEtPartial } from "./generated/site-et";
import type { Locale } from "./translations";

export type AboutFounder = {
  name: string;
  role: string;
  bio: string;
  image: string;
  badge?: string;
};

export const DENNY_TEAM_IMAGE = "/images/team/denny.jpg";

const DENNY_EN: AboutFounder = {
  name: "Magia Dilore Dancer Denny",
  role: "Chief Happiness Officer 🐾",
  badge: "Chief Happiness Officer",
  bio: "Denny is the heart of Stay With My Pet and our most important four-legged team member. He keeps us focused on what really matters — happy pets, caring people, new friendships and plenty of tail wags.\n\nWhen he's not supervising the team, Denny takes his role as Chief Happiness Officer very seriously: meeting new friends, testing treats and making sure there's never a dull moment.",
  image: DENNY_TEAM_IMAGE,
};

const DENNY_ET: AboutFounder = {
  name: "Magia Dilore Dancer Denny",
  role: "Chief Happiness Officer 🐾",
  badge: "Chief Happiness Officer",
  bio: "Denny on Stay With My Peti süda ja meie kõige olulisem neljajalgne meeskonnaliige. Ta hoiab meid keskendununa sellele, mis tegelikult loeb — õnnelikud lemmikud, hoolivad inimesed, uued sõprussuhted ja palju saba liputamist.\n\nKui ta just meeskonda ei juhenda, võtab Denny oma Chief Happiness Officeri rolli väga tõsiselt: kohtub uute sõpradega, testib maiuseid ja hoolitseb, et hetkegi ei jääks igavaks.",
  image: DENNY_TEAM_IMAGE,
};

function asFounder(row: { name: string; role: string; bio: string; image: string; badge?: string }): AboutFounder {
  return {
    name: row.name,
    role: row.role,
    bio: row.bio,
    image: row.image,
    badge: row.badge,
  };
}

export function getAboutFounders(locale: Locale): readonly AboutFounder[] {
  const base = locale === "et" ? siteEtPartial.about.founders : siteEnPartial.about.founders;
  const denny = locale === "et" ? DENNY_ET : DENNY_EN;
  const rows = base.map(asFounder);
  if (rows.some((row) => row.name === denny.name || row.image === denny.image)) {
    return rows.map((row) =>
      row.name === denny.name || row.image === denny.image ? { ...denny, ...row, badge: row.badge ?? denny.badge } : row,
    );
  }
  return [...rows, denny];
}
