import {
  defaultSeptemberTemplateConfig,
  trackedSponsorsFromConfig,
  unlinkedSponsorLabels,
  type CampaignTemplateConfig,
} from "@/lib/email-campaigns/template-config";

export type CampaignLinkType = "event" | "sponsor" | "site";

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

export const STAYWITHMYPET_WEBSITE_URL = "https://www.staywithmypet.ee/";
export const STAYWITHMYPET_WEBSITE_LINK: CampaignTrackedLink = {
  key: "staywithmypet_website",
  type: "site",
  label: "StayWithMyPet.ee",
  destinationUrl: STAYWITHMYPET_WEBSITE_URL,
};

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
    STAYWITHMYPET_WEBSITE_LINK,
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
  { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "et" as const },
  { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" as const },
];

/** Same first-test people; languages stay mixed so Automatic send can route EN/ET. */
export const ESTONIAN_TEST_RECIPIENTS = [
  { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "et" as const },
  { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" as const },
];

export const RESEND_TEST_RECIPIENTS = [
  { displayName: "Gerly Kullamaa", email: "gerlykullamaa@gmail.com", language: "et" as const },
  { displayName: "Kush Chadha", email: "kusheducation@gmail.com", language: "en" as const },
  { displayName: "A. Biancheri", email: "a.biancheri@ignostiq.com", language: "en" as const },
];

export const SEPTEMBER_TEMPLATE_KEY = "september_community_events";
export const SEPTEMBER_CAMPAIGN_NAME = "September community events";
export const SEPTEMBER_ESTONIAN_CAMPAIGN_NAME = SEPTEMBER_CAMPAIGN_NAME;

export const LIVING_WELL_20_SEP_EN_TEMPLATE_KEY = "living_well_20_sep_en";
export const LIVING_WELL_20_SEP_EN_CAMPAIGN_NAME = "Living Well With Pets – English – 20 September";
export const LIVING_WELL_20_SEP_EN_SUBJECT = "This Sunday: Living Well With Pets 🐾";
export const LIVING_WELL_20_SEP_EN_PREHEADER =
  "Free expert talks, dog-friendly treats and a relaxed Sunday at Moon.";
export const LIVING_WELL_20_SEP_EN_CTA = "SEE EVENT & JOIN US →";
export const LIVING_WELL_20_SEP_EN_PHOTO_PATHS = {
  hero: "/images/campaigns/living-well-20-sep/01_event-wide.jpg",
  atmosphere: "/images/campaigns/living-well-20-sep/DSC00139.jpg",
  iceCream: "/images/campaigns/living-well-20-sep/02_dog-icecream.JPG",
  dogPortrait: "/images/campaigns/living-well-20-sep/DSC00201.jpg",
  dogOwner: "/images/campaigns/living-well-20-sep/DSC00132(1).jpg",
  community: "/images/campaigns/living-well-20-sep/03_dog-human.jpg",
  talk: "/images/campaigns/living-well-20-sep/04_expert-talk.JPG",
  petFriend: "/images/campaigns/living-well-20-sep/08_pet-friend-dog.jpg",
} as const;

export const SEPTEMBER_SUBJECT_EN =
  "🐾 Join us for a relaxed and inspiring Sunday all about life with pets!";
export const SEPTEMBER_SUBJECT_ET =
  "🐾 Tule veeda üks mõnus ja sisukas pühapäev koos teiste loomasõpradega!";
