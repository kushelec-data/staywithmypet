export const SEPTEMBER_EVENT_LINKS = [
  {
    key: "event_13_sep",
    destinationUrl: "https://fb.me/e/bYV5xoYCJ",
    dateLabelEn: "13 September – in Estonian",
    dateLabelEt: "13. september – eesti keeles",
    title: "Hea elu koos lemmikuga",
    timeEn: "11:30 arrival | 12:00–14:00 programme",
    timeEt: "11.30 kogunemine | 12.00–14.00 programm",
  },
  {
    key: "event_20_sep",
    destinationUrl: "https://fb.me/e/6lnf7O3Sh",
    dateLabelEn: "20 September – in English",
    dateLabelEt: "20. september – inglise keeles",
    title: "Living Well With Pets",
    timeEn: "11:30 arrival | 12:00–14:00 programme",
    timeEt: "11.30 kogunemine | 12.00–14.00 programm",
  },
  {
    key: "event_27_sep",
    destinationUrl: "https://fb.me/e/75Aq16Q0F",
    dateLabelEn: "27 September – in Russian",
    dateLabelEt: "27. september – vene keeles",
    title: "Счастливая жизнь с питомцем",
    timeEn: "11:30 arrival | 12:00–14:00 programme",
    timeEt: "11.30 kogunemine | 12.00–14.00 programm",
  },
] as const;

export type CampaignEventLinkKey = (typeof SEPTEMBER_EVENT_LINKS)[number]["key"];

export function destinationForLinkKey(linkKey: string): string | null {
  return SEPTEMBER_EVENT_LINKS.find((link) => link.key === linkKey)?.destinationUrl ?? null;
}

export const DEFAULT_TEST_RECIPIENTS = [
  { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "en" as const },
  { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" as const },
];

export const SEPTEMBER_TEMPLATE_KEY = "september_community_events";

export const SEPTEMBER_SUBJECT_EN =
  "🐾 Join us for a relaxed and inspiring Sunday all about life with pets!";
export const SEPTEMBER_SUBJECT_ET =
  "🐾 Tule veeda üks mõnus ja sisukas pühapäev koos teiste loomasõpradega!";
