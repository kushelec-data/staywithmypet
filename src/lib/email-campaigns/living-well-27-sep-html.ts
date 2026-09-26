import { escapeHtml } from "@/lib/emails/layout";
import {
  clickPlaceholder,
  defaultClickHrefs,
  OPEN_PIXEL_PLACEHOLDER,
  sponsorLine,
  tableEventButton,
  wrapCampaignEmail,
  type CampaignCopyFields,
} from "@/lib/email-campaigns/html";
import {
  LIVING_WELL_27_SEP_CTA,
  LIVING_WELL_27_SEP_HEADLINE,
  LIVING_WELL_27_SEP_PHOTO_PATHS,
  LIVING_WELL_27_SEP_PREHEADER,
} from "@/lib/email-campaigns/events";
import { campaignEmailAssetUrl } from "@/lib/email-campaigns/public-base";
import {
  defaultSeptemberTemplateConfig,
  type CampaignTemplateConfig,
} from "@/lib/email-campaigns/template-config";

const BODY_P = 'style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#333333;"';
const HEADING_P =
  'style="margin:10px 0 14px;font-size:20px;line-height:1.35;color:#1a1a1a;font-weight:700;font-family:Georgia,\'Times New Roman\',serif;"';
const SECTION_LABEL =
  'style="margin:0 0 10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#1a6b5c;font-weight:700;"';
const NOTICE_P =
  'style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#1a6b5c;font-weight:700;"';
const IMG_STYLE =
  "display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:12px;";

type LangBlock = {
  label: string;
  noticeLead: string;
  noticeFollow: string;
  heading: string;
  intro: string;
  topics: string;
  welcome: string;
  comeAlong: string;
  dogsWelcome: string;
  programmeHeading: string;
  detailsHeading: string;
  dateLine: string;
  doorsLine: string;
  venueLine: string;
  freeLine: string;
  languageLine: string;
  gathering: string;
  welcomeTitle: string;
  wellbeingTitle: string;
  firstAidTitle: string;
  massageTitle: string;
};

const LANGS: LangBlock[] = [
  {
    label: "English",
    noticeLead: "🐾 THIS SUNDAY'S EVENT WILL BE HELD IN RUSSIAN.",
    noticeFollow: "The talks and presentations on 27 September will be in Russian.",
    heading: LIVING_WELL_27_SEP_HEADLINE.en,
    intro:
      "Join us at Restaurant Moon for a relaxed Sunday with practical talks, useful advice, dogs, good company and time to meet other people who simply love animals.",
    topics:
      "This Sunday we'll talk about the positive impact of animals on our mental wellbeing, pet first aid and dog massage.",
    welcome:
      "And you don't need to have a pet to join us. If you love animals and would simply like more of them in your life, you're very welcome.",
    comeAlong: "Come with a friend, come with your dog or simply come on your own.",
    dogsWelcome: "Friendly, well-behaved dogs are very welcome too. 🐶",
    programmeHeading: "Sunday programme",
    detailsHeading: "EVENT DETAILS",
    dateLine: "📅 Sunday, 27 September",
    doorsLine: "🕦 Doors open at 11:30",
    venueLine: "📍 Restaurant Moon, Telliskivi",
    freeLine: "🎟 Free to attend",
    languageLine: "🗣 Event language: Russian",
    gathering: "Gathering",
    welcomeTitle: "Welcome & a short introduction to Stay With My Pet",
    wellbeingTitle: "The Positive Impact of Animals on Mental Wellbeing",
    firstAidTitle: "Pet First Aid",
    massageTitle: "Dog Massage",
  },
  {
    label: "Eesti",
    noticeLead: "🐾 SEL PÜHAPÄEVAL TOIMUB ÜRITUS VENE KEELES.",
    noticeFollow: "27. septembri ettekanded ja esitlused toimuvad vene keeles.",
    heading: LIVING_WELL_27_SEP_HEADLINE.et,
    intro:
      "Tule Restoran Mooni veetma mõnusat pühapäeva praktiliste loengute, kasulike nõuannete, koerte, hea seltskonna ja võimalusega kohtuda teiste inimestega, kes lihtsalt armastavad loomi.",
    topics:
      "Sel pühapäeval räägime loomade positiivsest mõjust vaimsele heaolule, lemmiklooma esmaabist ja koera massaažist.",
    welcome:
      "Ja sa ei pea olema lemmikloomaomanik, et tulla. Kui armastad loomi ja soovid neid lihtsalt rohkem oma ellu, oled väga oodatud.",
    comeAlong: "Tule koos sõbraga, tule koos koeraga või tule lihtsalt ise.",
    dogsWelcome: "Sõbralikud, hästi käituvad koerad on samuti väga oodatud. 🐶",
    programmeHeading: "Pühapäeva programm",
    detailsHeading: "ÜRITUSE ANDMED",
    dateLine: "📅 Pühapäev, 27. september",
    doorsLine: "🕦 Uksed avanevad kell 11:30",
    venueLine: "📍 Restoran Moon, Telliskivi",
    freeLine: "🎟 Tasuta sissepääs",
    languageLine: "🗣 Ürituse keel: vene keel",
    gathering: "Kogunemine",
    welcomeTitle: "Tervitus ja lühike Stay With My Pet tutvustus",
    wellbeingTitle: "Loomade positiivne mõju vaimsele heaolule",
    firstAidTitle: "Lemmiklooma esmaabi",
    massageTitle: "Koera massaaž",
  },
  {
    label: "Русский",
    noticeLead: "🐾 В ЭТО ВОСКРЕСЕНЬЕ МЕРОПРИЯТИЕ ПРОЙДЁТ НА РУССКОМ ЯЗЫКЕ.",
    noticeFollow: "Все выступления и презентации 27 сентября будут на русском языке.",
    heading: LIVING_WELL_27_SEP_HEADLINE.ru,
    intro:
      "Присоединяйтесь к нам в ресторане Moon на спокойное воскресенье с практичными лекциями, полезными советами, собаками, хорошей компанией и временем познакомиться с другими людьми, которые просто любят животных.",
    topics:
      "В это воскресенье мы поговорим о позитивном влиянии животных на наше психическое благополучие, первой помощи питомцам и массаже собак.",
    welcome:
      "И вам не обязательно иметь питомца. Если вы любите животных и просто хотите, чтобы их было больше в вашей жизни, вы очень желанны.",
    comeAlong: "Приходите с другом, с собакой или просто сами.",
    dogsWelcome: "Дружелюбные, хорошо воспитанные собаки тоже очень желанны. 🐶",
    programmeHeading: "Программа воскресенья",
    detailsHeading: "ДЕТАЛИ СОБЫТИЯ",
    dateLine: "📅 Воскресенье, 27 сентября",
    doorsLine: "🕦 Двери открываются в 11:30",
    venueLine: "📍 Ресторан Moon, Telliskivi",
    freeLine: "🎟 Вход свободный",
    languageLine: "🗣 Язык мероприятия: русский",
    gathering: "Сбор",
    welcomeTitle: "Приветствие и короткое представление Stay With My Pet",
    wellbeingTitle: "Позитивное влияние животных на психическое благополучие",
    firstAidTitle: "Первая помощь питомцам",
    massageTitle: "Массаж собак",
  },
];

function p(text: string): string {
  return `<p ${BODY_P}>${escapeHtml(text)}</p>`;
}

function heading(text: string): string {
  return `<p ${HEADING_P}>${escapeHtml(text)}</p>`;
}

function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;">
  <tr>
    <td style="border-top:1px solid #e8e2d6;font-size:0;line-height:0;height:1px;">&nbsp;</td>
  </tr>
</table>`;
}

function centeredCta(href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
  <tr>
    <td align="center">
      ${tableEventButton(LIVING_WELL_27_SEP_CTA.en, href)}
    </td>
  </tr>
</table>`;
}

function photo(src: string, alt: string): string {
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="544" style="${IMG_STYLE}" />`;
}

function photoBlock(src: string, alt: string, margin = "0 0 16px"): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${margin};">
  <tr>
    <td style="padding:0;">
      ${photo(src, alt)}
    </td>
  </tr>
</table>`;
}

function photoPair(
  left: { src: string; alt: string },
  right: { src: string; alt: string },
): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
  <tr>
    <td class="swmp-stack" width="50%" valign="top" style="padding:0 12px 0 0;">
      ${photo(left.src, left.alt)}
    </td>
    <td class="swmp-stack" width="50%" valign="top" style="padding:0;">
      ${photo(right.src, right.alt)}
    </td>
  </tr>
</table>`;
}

function programmeRow(time: string, title: string, speakers?: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;background-color:#f7f5f0;border:1px solid #e8e2d6;border-radius:12px;">
  <tr>
    <td style="padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:13px;line-height:1.4;color:#1a6b5c;font-weight:700;">${escapeHtml(time)}</p>
      <p style="margin:0 0 ${speakers ? "4px" : "0"};font-size:15px;line-height:1.4;color:#1a1a1a;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(title)}</p>
      ${speakers ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#555555;">${escapeHtml(speakers)}</p>` : ""}
    </td>
  </tr>
</table>`;
}

function detailsCard(block: LangBlock): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;background-color:#f7f5f0;border:1px solid #e8e2d6;border-radius:12px;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="margin:0 0 10px;font-size:16px;line-height:1.4;color:#1a6b5c;font-weight:700;">${escapeHtml(block.detailsHeading)}</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#1a1a1a;">${escapeHtml(block.dateLine)}</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#333333;">${escapeHtml(block.doorsLine)}</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#333333;">${escapeHtml(block.venueLine)}</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#333333;">${escapeHtml(block.freeLine)}</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:#333333;">${escapeHtml(block.languageLine)}</p>
    </td>
  </tr>
</table>`;
}

function languageSection(block: LangBlock): string {
  return `<p ${SECTION_LABEL}>${escapeHtml(block.label)}</p>
<p ${NOTICE_P}>${escapeHtml(block.noticeLead)}</p>
${p(block.noticeFollow)}
${heading(block.heading)}
${p(block.intro)}
${p(block.topics)}
${p(block.welcome)}
${p(block.comeAlong)}
${p(block.dogsWelcome)}
${heading(block.programmeHeading)}
${programmeRow("11:30", block.gathering)}
${programmeRow("11:50", block.welcomeTitle, "Gerly Kullamaa / Tamara Lengi")}
${programmeRow("12:00", block.wellbeingTitle, "Tamara Lengi")}
${programmeRow("12:30", block.firstAidTitle, "Karina Kušner")}
${programmeRow("13:00", block.massageTitle, "Annely Ojamets")}
${detailsCard(block)}`;
}

export function assembleLivingWell27SepInnerHtml(
  clickHrefs: Record<string, string>,
  config: CampaignTemplateConfig,
): string {
  const hrefs = { ...defaultClickHrefs(config), ...clickHrefs };
  const eventHref = hrefs.event_27_sep ?? clickPlaceholder("event_27_sep");
  const websiteHref = hrefs.staywithmypet_website ?? clickPlaceholder("staywithmypet_website");
  const photos = {
    venueWide: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.venueWide),
    eventWide: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.eventWide),
    guestDog: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.guestDog),
    expert: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.expert),
    community: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.community),
    whiteDog: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.whiteDog),
    dogAndGuest: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.dogAndGuest),
    dogsMeeting: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.dogsMeeting),
    communityDog: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.communityDog),
    friendlyDogs: campaignEmailAssetUrl(LIVING_WELL_27_SEP_PHOTO_PATHS.friendlyDogs),
  };

  return `
${languageSection(LANGS[0])}
${divider()}
${languageSection(LANGS[1])}
${divider()}
${languageSection(LANGS[2])}
${divider()}
<p ${SECTION_LABEL}>LAST SUNDAY 🐾</p>
${heading("A little glimpse of our last event")}
${photoBlock(photos.venueWide, "Guests gathered at Restaurant Moon last Sunday")}
${p("Last Sunday, our community came together at Moon for expert talks, conversations, new connections and plenty of four-legged guests.")}
${photoBlock(photos.eventWide, "A wide view of last Sunday’s Stay With My Pet event")}
${photoPair(
    { src: photos.guestDog, alt: "A guest and their dog listening at the event" },
    { src: photos.expert, alt: "An expert talk at last Sunday’s event" },
  )}
${photoBlock(photos.community, "The Stay With My Pet community at Restaurant Moon")}
${photoPair(
    { src: photos.whiteDog, alt: "A white dog with a guest at the event" },
    { src: photos.dogAndGuest, alt: "A guest holding a dog at Stay With My Pet" },
  )}
${photoPair(
    { src: photos.dogsMeeting, alt: "Dogs meeting at last Sunday’s event" },
    { src: photos.communityDog, alt: "People with a dog at Stay With My Pet" },
  )}
${photoBlock(photos.friendlyDogs, "Guests and dogs spending time together at Moon")}
${centeredCta(eventHref)}
${heading("WITH A LITTLE HELP FROM OUR FRIENDS ❤️")}
${sponsorLine(hrefs, config)}
${p("See you at Moon! 🐾")}
<p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:#333333;">Gerly &amp; the Stay With My Pet team</p>
<p style="margin:16px 0 0;text-align:center;font-size:12px;line-height:18px;color:#888888;">Visit us at <a href="${escapeHtml(websiteHref)}" target="_blank" style="color:#1a6b5c;font-weight:400;text-decoration:underline;">StayWithMyPet.ee</a> 🐾</p>`;
}

export function livingWell27SepCopy(): CampaignCopyFields {
  return {
    preheaderEn: LIVING_WELL_27_SEP_PREHEADER.en,
    preheaderEt: LIVING_WELL_27_SEP_PREHEADER.en,
    bodyBeforeEn: "Combined EN + ET + RU invitation — 27 September.",
    bodyAfterEn: "See you at Moon! 🐾",
    bodyBeforeEt: "Combined EN + ET + RU invitation — 27 September.",
    bodyAfterEt: "See you at Moon! 🐾",
  };
}

export function renderLivingWell27SepHtml(opts: {
  logoUrl: string;
  openPixelUrl: string;
  clickHrefs: Record<string, string>;
  templateConfig?: CampaignTemplateConfig;
}): string {
  const config = opts.templateConfig ?? defaultSeptemberTemplateConfig();
  return wrapCampaignEmail({
    language: "en",
    headline: "27 September · Restaurant Moon",
    preheader: LIVING_WELL_27_SEP_PREHEADER.en,
    innerHtml: assembleLivingWell27SepInnerHtml(opts.clickHrefs, config),
    logoUrl: opts.logoUrl,
    openPixelUrl: opts.openPixelUrl,
  });
}

export function defaultLivingWell27SepBodies(
  logoUrl: string,
  templateConfig: CampaignTemplateConfig = defaultSeptemberTemplateConfig(),
): { htmlEn: string; htmlEt: string; htmlRu: string } {
  const html = renderLivingWell27SepHtml({
    logoUrl,
    openPixelUrl: OPEN_PIXEL_PLACEHOLDER,
    clickHrefs: defaultClickHrefs(templateConfig),
    templateConfig,
  });
  return { htmlEn: html, htmlEt: html, htmlRu: html };
}
