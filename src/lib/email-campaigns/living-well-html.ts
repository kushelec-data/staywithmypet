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
  LIVING_WELL_20_SEP_EN_CTA,
  LIVING_WELL_20_SEP_EN_PHOTO_PATHS,
  LIVING_WELL_20_SEP_EN_PREHEADER,
  LIVING_WELL_20_SEP_EN_SUBJECT,
} from "@/lib/email-campaigns/events";
import { campaignEmailAssetUrl } from "@/lib/email-campaigns/public-base";
import {
  defaultSeptemberTemplateConfig,
  type CampaignTemplateConfig,
} from "@/lib/email-campaigns/template-config";

const BODY_P = 'style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#333333;"';
const HEADING_P =
  'style="margin:22px 0 12px;font-size:16px;line-height:1.45;color:#1a6b5c;font-weight:700;letter-spacing:0.01em;"';
const IMG_STYLE =
  "display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:12px;";

function p(text: string): string {
  return `<p ${BODY_P}>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
}

function heading(text: string): string {
  return `<p ${HEADING_P}>${escapeHtml(text)}</p>`;
}

function centeredCta(href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
  <tr>
    <td align="center">
      ${tableEventButton(LIVING_WELL_20_SEP_EN_CTA, href)}
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

function expertRow(name: string, role: string, topic: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;background-color:#f7f5f0;border:1px solid #e8e2d6;border-radius:12px;">
  <tr>
    <td style="padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:15px;line-height:1.4;color:#1a1a1a;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(name)} · ${escapeHtml(role)}</p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#555555;">${escapeHtml(topic)}</p>
    </td>
  </tr>
</table>`;
}

function detailsCard(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;background-color:#f7f5f0;border:1px solid #e8e2d6;border-radius:12px;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="margin:0 0 10px;font-size:16px;line-height:1.4;color:#1a6b5c;font-weight:700;">EVENT DETAILS</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#1a1a1a;">📅 Sunday, 20 September</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#333333;">🕦 Doors open at 11:30<br>Programme 12:00–14:00</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#333333;">📍 Restaurant Moon, Telliskivi</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#333333;">🎟 Free to attend</p>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#555555;">Friendly, well-behaved dogs are very welcome too. 🐶</p>
    </td>
  </tr>
</table>`;
}

export function assembleLivingWellEnglishInnerHtml(
  clickHrefs: Record<string, string>,
  config: CampaignTemplateConfig,
): string {
  const hrefs = { ...defaultClickHrefs(config), ...clickHrefs };
  const eventHref = hrefs.event_20_sep ?? clickPlaceholder("event_20_sep");
  const photos = {
    hero: campaignEmailAssetUrl(LIVING_WELL_20_SEP_EN_PHOTO_PATHS.hero),
    atmosphere: campaignEmailAssetUrl(LIVING_WELL_20_SEP_EN_PHOTO_PATHS.atmosphere),
    iceCream: campaignEmailAssetUrl(LIVING_WELL_20_SEP_EN_PHOTO_PATHS.iceCream),
    dogPortrait: campaignEmailAssetUrl(LIVING_WELL_20_SEP_EN_PHOTO_PATHS.dogPortrait),
    dogOwner: campaignEmailAssetUrl(LIVING_WELL_20_SEP_EN_PHOTO_PATHS.dogOwner),
    community: campaignEmailAssetUrl(LIVING_WELL_20_SEP_EN_PHOTO_PATHS.community),
    talk: campaignEmailAssetUrl(LIVING_WELL_20_SEP_EN_PHOTO_PATHS.talk),
  };

  return `
${p("Hi!")}
${p("This email is in English because this Sunday’s event will be held in English. 🐾")}
${heading("LOOKING FOR A PLAN FOR SUNDAY? WE HAVE ONE.")}
${p("Last Sunday, we brought the Stay With My Pet community together in real life for the first time — and this weekend, we’re doing it again.")}
${p("This time, the event will be in English.")}
${p("Join us at Restaurant Moon for a relaxed Sunday with practical talks from pet experts, good company, dogs, drinks and a chance to meet other Pet Parents, Pet Friends and people who simply enjoy being around animals.")}
${p("And if Sunday is grey and rainy outside? ☔ Even better reason to spend it somewhere warm — with dogs, interesting people, ice cream and something useful to learn.")}
${centeredCta(eventHref)}
${photoBlock(photos.hero, "Stay With My Pet community gathering at Restaurant Moon")}
${photoBlock(photos.atmosphere, "Guests spending Sunday together at Restaurant Moon")}
${heading("HERE’S WHAT’S WAITING FOR YOU:")}
${heading("🐾 FOUR PRACTICAL TALKS FROM OUR EXPERTS")}
${expertRow("Dagris Punder", "Canine Physiotherapist", "How to spot a problem before it becomes more serious")}
${expertRow("DVM Kristina Kimask", "PetCity Veterinarian", "First Aid for Dogs")}
${expertRow("Jessica Viinamägi", "Dog Handler", "Living Well With Your Dog")}
${expertRow("Tamara Lengi", "Positive Psychology Coach & Founder of BlooMind", "The Positive Impact of Pets on Our Mental Wellbeing")}
${photoBlock(photos.talk, "An expert talk at Stay With My Pet")}
${heading("💬 TIME TO MEET AND CONNECT")}
${p("Stay after the talks, chat with our speakers and meet other people from the Stay With My Pet community.")}
${p("Come with a friend, come with your dog or simply come on your own.")}
${p("It’s designed to be an easy, friendly Sunday where conversations happen naturally.")}
${heading("🍦 AND A FEW EXTRAS")}
${p("Enjoy a welcome drink from YOOK, Gelato Ladies ice cream for people and dogs, plus a small gift bag for every guest.")}
${p("Yes — the dogs get ice cream too. 🐶🍦")}
${photoBlock(photos.iceCream, "A dog enjoying Gelato Ladies ice cream at last Sunday’s event")}
${p("And you don’t need to have a pet to join us.")}
${p("If you love animals and would simply like more of them in your life, you’re just as welcome.")}
${heading("A LITTLE GLIMPSE OF LAST SUNDAY 👇")}
${photoBlock(photos.dogPortrait, "A dog at last Sunday’s Stay With My Pet event")}
${photoPair(
    { src: photos.dogOwner, alt: "A guest and their dog at the event" },
    { src: photos.community, alt: "A dog with their person in the Stay With My Pet community" },
  )}
${p("Last Sunday, dogs met new friends, people met new people, and our four-legged guests discovered that attending an event can apparently involve ice cream. 😉")}
${p("There were expert talks, questions, conversations, treats and plenty of dog-to-dog introductions.")}
${p("And this Sunday, we’re doing it all again — in English.")}
${heading("DON’T JUST SEE THE PHOTOS AFTERWARDS THIS TIME. 🐾")}
${p("Come and be part of it.")}
${p("Spend a couple of hours learning something genuinely useful about pets, meet people who share your love for animals and enjoy a cozy Sunday indoors while Tallinn does whatever Tallinn wants to do with the weather outside. ☔")}
${detailsCard()}
${centeredCta(eventHref)}
${p("Free entry — just come, meet, learn and enjoy the afternoon with us.")}
${heading("WITH A LITTLE HELP FROM OUR FRIENDS ❤️")}
${sponsorLine(hrefs, config)}
${p("See you at Moon! 🐾")}
<p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:#333333;">Gerly &amp; the Stay With My Pet team</p>`;
}

export function livingWellEnglishCopy(): CampaignCopyFields {
  return {
    preheaderEn: LIVING_WELL_20_SEP_EN_PREHEADER,
    preheaderEt: LIVING_WELL_20_SEP_EN_PREHEADER,
    bodyBeforeEn: "English Living Well With Pets invitation — 20 September.",
    bodyAfterEn: "See you at Moon! 🐾",
    bodyBeforeEt: "English Living Well With Pets invitation — 20 September.",
    bodyAfterEt: "See you at Moon! 🐾",
  };
}

export function renderLivingWellEnglishHtml(opts: {
  logoUrl: string;
  openPixelUrl: string;
  clickHrefs: Record<string, string>;
  templateConfig?: CampaignTemplateConfig;
  preheader?: string;
  headline?: string;
}): string {
  const config = opts.templateConfig ?? defaultSeptemberTemplateConfig();
  return wrapCampaignEmail({
    language: "en",
    headline: opts.headline ?? LIVING_WELL_20_SEP_EN_SUBJECT,
    preheader: opts.preheader ?? LIVING_WELL_20_SEP_EN_PREHEADER,
    innerHtml: assembleLivingWellEnglishInnerHtml(opts.clickHrefs, config),
    logoUrl: opts.logoUrl,
    openPixelUrl: opts.openPixelUrl,
  });
}

export function defaultLivingWellEnglishBodies(
  logoUrl: string,
  templateConfig: CampaignTemplateConfig = defaultSeptemberTemplateConfig(),
  copy?: Partial<CampaignCopyFields> & { subjectEn?: string; subjectEt?: string },
): { htmlEn: string; htmlEt: string } {
  const clickHrefs = defaultClickHrefs(templateConfig);
  const html = renderLivingWellEnglishHtml({
    logoUrl,
    openPixelUrl: OPEN_PIXEL_PLACEHOLDER,
    clickHrefs,
    templateConfig,
    preheader: copy?.preheaderEn ?? LIVING_WELL_20_SEP_EN_PREHEADER,
    headline: copy?.subjectEn ?? copy?.subjectEt ?? LIVING_WELL_20_SEP_EN_SUBJECT,
  });
  return { htmlEn: html, htmlEt: html };
}
