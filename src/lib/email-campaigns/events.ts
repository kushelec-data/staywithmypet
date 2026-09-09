import {
  defaultSeptemberTemplateConfig,
  trackedSponsorsFromConfig,
  unlinkedSponsorLabels,
  type CampaignTemplateConfig,
} from "@/lib/email-campaigns/template-config";

export type CampaignLinkType = "event" | "sponsor";

export type CampaignTrackedLink = {
  key: string;
  type: CampaignLinkType;
  label: string;
  destinationUrl: string;
};

export type SeptemberEventCard = CampaignTrackedLink & {
  dateLabelEn: string;
  dateLabelEt: string;
  title: string;
  timeEn: string;
  timeEt: string;
};

/** 13 September: canonical Facebook event (not a share/profile/invite short link). */
export const EVENT_13_SEP_URL =
  "https://www.facebook.com/events/s/hea-elu-koos-lemmikuga-loengud/934700659060911/?rdid=bWSOyPPSWwCm6vac&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F19h3m6ur2P%2F#";

/** Resolved from fb.me/e/6lnf7O3Sh → facebook.com/events/{id} (not a profile). */
export const EVENT_20_SEP_URL = "https://www.facebook.com/events/3256274334761111/";

/** Resolved from fb.me/e/75Aq16Q0F → facebook.com/events/{id} (not a profile). */
export const EVENT_27_SEP_URL = "https://www.facebook.com/events/28308835972092411/";

export const SEPTEMBER_EVENT_LINKS: SeptemberEventCard[] = [
  {
    key: "event_13_sep",
    type: "event",
    label: "13 September event",
    destinationUrl: EVENT_13_SEP_URL,
    dateLabelEn: "13 September – in Estonian",
    dateLabelEt: "13. september – eesti keeles",
    title: "Hea elu koos lemmikuga",
    timeEn: "11:30 arrival | 12:00–14:00 programme",
    timeEt: "11.30 kogunemine | 12.00–14.00 programm",
  },
  {
    key: "event_20_sep",
    type: "event",
    label: "20 September event",
    destinationUrl: EVENT_20_SEP_URL,
    dateLabelEn: "20 September – in English",
    dateLabelEt: "20. september – inglise keeles",
    title: "Living Well With Pets",
    timeEn: "11:30 arrival | 12:00–14:00 programme",
    timeEt: "11.30 kogunemine | 12.00–14.00 programm",
  },
  {
    key: "event_27_sep",
    type: "event",
    label: "27 September event",
    destinationUrl: EVENT_27_SEP_URL,
    dateLabelEn: "27 September – in Russian",
    dateLabelEt: "27. september – vene keeles",
    title: "Счастливая жизнь с питомцем",
    timeEn: "11:30 arrival | 12:00–14:00 programme",
    timeEt: "11.30 kogunemine | 12.00–14.00 programm",
  },
];

export function trackedLinksFromTemplateConfig(
  config: CampaignTemplateConfig = defaultSeptemberTemplateConfig(),
): CampaignTrackedLink[] {
  return [
    ...SEPTEMBER_EVENT_LINKS.map(({ key, type, label, destinationUrl }) => ({
      key,
      type,
      label,
      destinationUrl,
    })),
    ...trackedSponsorsFromConfig(config),
  ];
}

export const CAMPAIGN_TRACKED_LINKS = trackedLinksFromTemplateConfig();
export const SEPTEMBER_SPONSOR_LINKS = trackedSponsorsFromConfig(defaultSeptemberTemplateConfig());
export const UNLINKED_SPONSORS = unlinkedSponsorLabels();

export function destinationForLinkKey(linkKey: string): string | null {
  return CAMPAIGN_TRACKED_LINKS.find((link) => link.key === linkKey)?.destinationUrl ?? null;
}

export function catalogLinkByKey(linkKey: string): CampaignTrackedLink | null {
  return CAMPAIGN_TRACKED_LINKS.find((link) => link.key === linkKey) ?? null;
}

export const DEFAULT_TEST_RECIPIENTS = [
  { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "en" as const },
  { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" as const },
];

/** Same first-test people, Estonian template. Does not change the English campaign recipients. */
export const ESTONIAN_TEST_RECIPIENTS = [
  { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "et" as const },
  { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "et" as const },
];

export const RESEND_TEST_RECIPIENTS = [
  { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "en" as const },
  { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" as const },
  { displayName: "A. Biancheri", email: "a.biancheri@ignostiq.com", language: "en" as const },
];

export const SEPTEMBER_TEMPLATE_KEY = "september_community_events";
export const SEPTEMBER_ESTONIAN_CAMPAIGN_NAME = "September community events (Estonian)";

export const SEPTEMBER_SUBJECT_EN =
  "🐾 Join us for a relaxed and inspiring Sunday all about life with pets!";
export const SEPTEMBER_SUBJECT_ET =
  "🐾 Tule veeda üks mõnus ja sisukas pühapäev koos teiste loomasõpradega!";
