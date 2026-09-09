import { escapeHtml } from "@/lib/emails/layout";
import { eventButtonLabel, type CampaignLanguage } from "@/lib/email-campaigns/locale";
import { SEPTEMBER_EVENT_LINKS, trackedLinksFromTemplateConfig, type SeptemberEventCard } from "@/lib/email-campaigns/events";
import {
  defaultSeptemberTemplateConfig,
  type CampaignTemplateConfig,
} from "@/lib/email-campaigns/template-config";

export const TRACK_PLACEHOLDER_PREFIX = "https://swmp.invalid/track/click/";
export const OPEN_PIXEL_PLACEHOLDER = "https://swmp.invalid/track/open/PLACEHOLDER";
export const UNSUBSCRIBE_PLACEHOLDER = "https://swmp.invalid/track/unsub/PLACEHOLDER";

export function clickPlaceholder(linkKey: string): string {
  return `${TRACK_PLACEHOLDER_PREFIX}${linkKey}`;
}

/** Email-client compatible button: whole cell is the clickable <a>. Destination URL is never printed. */
export function tableEventButton(label: string, href: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
  <tr>
    <td align="center" bgcolor="#1a6b5c" style="background-color:#1a6b5c;border-radius:8px;mso-padding-alt:12px 28px;">
      <a href="${safeHref}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:18px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">${safeLabel}</a>
    </td>
  </tr>
</table>`;
}

function eventCard(language: CampaignLanguage, link: SeptemberEventCard, href: string): string {
  const date = language === "et" ? link.dateLabelEt : link.dateLabelEn;
  const time = language === "et" ? link.timeEt : link.timeEn;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background-color:#f7f5f0;border:1px solid #e8e2d6;border-radius:12px;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="margin:0 0 6px;font-size:14px;line-height:1.4;color:#1a6b5c;font-weight:700;">${escapeHtml(date)}</p>
      <p style="margin:0 0 4px;font-size:18px;line-height:1.35;color:#1a1a1a;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(link.title)}</p>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#555555;">${escapeHtml(time)}</p>
      ${tableEventButton(eventButtonLabel(language), href)}
    </td>
  </tr>
</table>`;
}

const SPONSOR_LINK_STYLE =
  "color:#1a6b5c;font-weight:600;text-decoration:none;cursor:pointer;";

function sponsorLine(clickHrefs: Record<string, string>, config: CampaignTemplateConfig): string {
  const parts = config.sponsors.map((item) =>
    item.destinationUrl
      ? sponsorAnchor(item.label, item.key, clickHrefs)
      : escapeHtml(item.label),
  );
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#1a6b5c;font-weight:600;">${parts.join(" · ")} 🤍</p>`;
}

function sponsorAnchor(label: string, key: string, clickHrefs: Record<string, string>): string {
  const href = clickHrefs[key] ?? clickPlaceholder(key);
  return `<a href="${escapeHtml(href)}" target="_blank" style="${SPONSOR_LINK_STYLE}">${escapeHtml(label)}</a>`;
}

function defaultClickHrefs(config: CampaignTemplateConfig): Record<string, string> {
  return Object.fromEntries(trackedLinksFromTemplateConfig(config).map((link) => [link.key, clickPlaceholder(link.key)]));
}

const BODY_P =
  'style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#333333;"';
const HEADING_P =
  'style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#1a6b5c;font-weight:700;"';

export const DEFAULT_PREHEADER_EN =
  "Free talks, practical tips and great company – choose the event that suits you best.";
export const DEFAULT_PREHEADER_ET =
  "Tasuta loengud, praktilised teadmised ja mõnus seltskond – vali endale sobiv sündmus.";

export const DEFAULT_CAMPAIGN_CLOSING_EN = `If you’re planning to join us, please mark “Going” on the relevant Facebook event, so we can get a better idea of how many guests to expect.

Bring a friend, a family member or your dog – or simply come on your own. All you need is an interest in animals and in making life with them even better.

See you at Moon!🐾

Gerly & the Stay With My Pet team`;

export const DEFAULT_CAMPAIGN_CLOSING_ET = `Kui oled tulemas, märgi palun vastaval Facebooki sündmusel „Osalen“, et oskaksime külaliste arvuga võimalikult hästi arvestada.

Võta kaasa sõber, pereliige või koer – või tule lihtsalt ise. Kõige olulisem on huvi loomade ja hea elu vastu koos nendega.

Kohtumiseni Moonis! 🐾

Gerly & Stay With My Peti tiim`;

export const EN_CLOSING_START = "If you’re planning to join us, please mark";
export const ET_CLOSING_START = "Kui oled tulemas, märgi palun";

export const DEFAULT_CAMPAIGN_BODY_EN = `Hi!

This September, we’re bringing the Stay With My Pet community together in real life for the very first time. 🐾

We’re hosting three free community events at Restaurant Moon, all about making life with pets better – for both animals and the people who love them.

We’ve invited experts from different fields to share practical knowledge about pet health, behaviour and wellbeing. Across the three events, we’ll cover topics ranging from pet first aid and dental care to canine movement and behaviour. We’ll also look at the relationship from the other side – how pets can positively influence our own mental wellbeing.

This time, the main focus will be on dogs, but all Pet Parents and Pet Friends are warmly welcome. Friendly, well-behaved dogs are very welcome to join with their humans too. 🐶

📍 All three events will take place at Restaurant Moon in Telliskivi, and attendance is free.

There’s more to look forward to than just the talks

YOOK will welcome us with a refreshing drink, while Gelato Ladies will bring along their ice cream cart with something delicious for both people and dogs – including a special dog-friendly ice cream created especially for our events. 🍦🐶

Drinks and light snacks will be available to purchase from Moon throughout the event, and from 13:00 the kitchen will also be open if you’d like something more substantial.

Every guest will also receive a small goodie bag put together with the help of our wonderful partners, filled with surprises, especially for our canine guests. 🎁

${DEFAULT_CAMPAIGN_CLOSING_EN}`;

export const DEFAULT_CAMPAIGN_BODY_ET = `Tere!

Septembris toome Stay With My Peti kogukonna esimest korda kokku ka päriselus. 🐾

Korraldame restoranis Moon kolm tasuta kogukonnaüritust, kus räägime sellest, kuidas muuta elu koos lemmikuga paremaks – nii loomade kui ka inimeste jaoks.

Oleme kokku kutsunud erinevate valdkondade eksperdid, kes jagavad praktilisi teadmisi loomade tervisest, käitumisest ja heaolust. Ürituste jooksul räägime muu hulgas lemmikute esmaabist ja suuhügieenist, koerte liikumisest ja käitumisest ning vaatame ka teisele poole – kuidas mõjutavad lemmikloomad meie enda vaimset heaolu.

Seekord on suurem tähelepanu koertel, kuid osalema on oodatud kõik loomaomanikud ja loomasõbrad. Ka sõbralikud ja hästi käituvad koerad on koos oma inimestega väga oodatud. 🐶

📍 Kõik kolm sündmust toimuvad restoranis Moon, Telliskivis ning osalemine on tasuta.

Lisaks loengutele ootab sind kohapeal veel nii mõndagi

Tervitusjoogiga kostitab meid YOOK ning Gelato Ladies toob kohale oma jäätisekäru, kust leiab midagi head nii inimestele kui ka koertele – spetsiaalselt meie sündmuste jaoks valmib ka koertele mõeldud jäätis. 🍦🐶

Moonist saab kogu sündmuse jooksul osta jooke ja kergemaid suupisteid ning alates kella 13st on avatud ka köök toekamaks kehakinnituseks.

Igat külalist ootab meie heade partnerite abil kokku pandud väike kinkekott, kust leiab üllatusi eelkõige meie neljajalgsetele sõpradele. 🎁

${DEFAULT_CAMPAIGN_CLOSING_ET}`;

function closingLeadBold(language: CampaignLanguage): string {
  return language === "et"
    ? "Kui oled tulemas, märgi palun vastaval Facebooki sündmusel „Osalen“"
    : "If you’re planning to join us, please mark “Going” on the relevant Facebook event,";
}

export function splitCampaignBodyForEvents(
  bodyText: string,
  language: CampaignLanguage,
): { intro: string; closing: string } {
  const start = language === "et" ? ET_CLOSING_START : EN_CLOSING_START;
  const fallback = language === "et" ? DEFAULT_CAMPAIGN_CLOSING_ET : DEFAULT_CAMPAIGN_CLOSING_EN;
  const index = bodyText.indexOf(start);
  if (index < 0) {
    return { intro: bodyText.trim(), closing: fallback };
  }
  return {
    intro: bodyText.slice(0, index).trim(),
    closing: bodyText.slice(index).trim() || fallback,
  };
}

/** Convert pasted/written campaign copy into email paragraphs. Not raw HTML. */
export function campaignBodyTextToHtml(text: string): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => {
      const html = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p ${BODY_P}>${html}</p>`;
    })
    .join("\n");
}

export function campaignClosingTextToHtml(text: string, language: CampaignLanguage): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const boldLead = escapeHtml(closingLeadBold(language));
  return blocks
    .map((block, index) => {
      let html = escapeHtml(block).replace(/\n/g, "<br>");
      if (html.startsWith(boldLead)) {
        html = `<strong>${boldLead}</strong>${html.slice(boldLead.length)}`;
      }
      const margin =
        index === blocks.length - 1 ? "margin:0" : index === blocks.length - 2 ? "margin:0 0 8px" : "margin:0 0 16px";
      return `<p style="${margin};font-size:15px;line-height:1.65;color:#333333;">${html}</p>`;
    })
    .join("\n");
}

export function assembleCampaignInnerHtml(
  language: CampaignLanguage,
  bodyText: string,
  clickHrefs: Record<string, string>,
  config: CampaignTemplateConfig,
): string {
  const hrefs = { ...defaultClickHrefs(config), ...clickHrefs };
  const cards = SEPTEMBER_EVENT_LINKS.map((link) => eventCard(language, link, hrefs[link.key])).join("");
  const { intro, closing } = splitCampaignBodyForEvents(bodyText, language);
  const choose = language === "et" ? "Vali endale sobiv sündmus:" : "Choose the event that suits you:";
  const thanks =
    language === "et"
      ? "Suur aitäh meie sündmuste headele partneritele ja toetajatele:"
      : "A big thank you to our event partners and supporters:";
  return `
${campaignBodyTextToHtml(intro)}
<p ${HEADING_P}>${escapeHtml(choose)}</p>
${cards}
${campaignClosingTextToHtml(closing, language)}
<p ${BODY_P}>${escapeHtml(thanks)}</p>
${sponsorLine(hrefs, config)}`;
}

export function wrapCampaignEmail(opts: {
  language: CampaignLanguage;
  headline: string;
  preheader: string;
  innerHtml: string;
  logoUrl: string;
  openPixelUrl: string;
  unsubscribeUrl?: string;
}): string {
  const headline = escapeHtml(opts.headline);
  const preheader = escapeHtml(opts.preheader);
  const logo = escapeHtml(opts.logoUrl);
  const pixel = escapeHtml(opts.openPixelUrl);
  const unsub = escapeHtml(opts.unsubscribeUrl ?? UNSUBSCRIBE_PLACEHOLDER);
  const unsubLabel = opts.language === "et" ? "Loobu turunduskirjadest" : "Unsubscribe from marketing emails";
  return `<!DOCTYPE html>
<html lang="${opts.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f5f0;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f5f0;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 16px;text-align:center;">
              <img src="${logo}" alt="Stay With My Pet" width="140" style="display:inline-block;max-width:140px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e2d6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#1a6b5c;padding:22px 28px;">
                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#d4ede4;font-weight:700;">Stay With My Pet</p>
                    <h1 style="margin:0;font-size:22px;line-height:1.35;color:#ffffff;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${headline}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 28px 8px;background-color:#ffffff;">
                    ${opts.innerHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px;background-color:#ffffff;">
                    <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#888888;">Stay With My Pet · Tallinn</p>
                    <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#888888;"><a href="${unsub}" style="color:#888888;text-decoration:underline;">${unsubLabel}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <img src="${pixel}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const HEADLINE_EN = "🐾 Join us for a relaxed and inspiring Sunday all about life with pets!";
const HEADLINE_ET = "🐾 Tule veeda üks mõnus ja sisukas pühapäev koos teiste loomasõpradega!";

export function renderSeptemberCampaignHtml(opts: {
  language: CampaignLanguage;
  logoUrl: string;
  openPixelUrl: string;
  clickHrefs: Record<string, string>;
  templateConfig?: CampaignTemplateConfig;
  bodyText?: string;
  preheader?: string;
  headline?: string;
}): string {
  const config = opts.templateConfig ?? defaultSeptemberTemplateConfig();
  const bodyText =
    opts.bodyText ?? (opts.language === "et" ? DEFAULT_CAMPAIGN_BODY_ET : DEFAULT_CAMPAIGN_BODY_EN);
  const inner = assembleCampaignInnerHtml(opts.language, bodyText, opts.clickHrefs, config);
  return wrapCampaignEmail({
    language: opts.language,
    headline: opts.headline ?? (opts.language === "et" ? HEADLINE_ET : HEADLINE_EN),
    preheader: opts.preheader ?? (opts.language === "et" ? DEFAULT_PREHEADER_ET : DEFAULT_PREHEADER_EN),
    innerHtml: inner,
    logoUrl: opts.logoUrl,
    openPixelUrl: opts.openPixelUrl,
  });
}

export function defaultSeptemberBodies(
  logoUrl: string,
  templateConfig: CampaignTemplateConfig = defaultSeptemberTemplateConfig(),
  copy?: {
    bodyEn?: string;
    bodyEt?: string;
    preheaderEn?: string;
    preheaderEt?: string;
    subjectEn?: string;
    subjectEt?: string;
  },
): { htmlEn: string; htmlEt: string } {
  const clickHrefs = defaultClickHrefs(templateConfig);
  return {
    htmlEn: renderSeptemberCampaignHtml({
      language: "en",
      logoUrl,
      openPixelUrl: OPEN_PIXEL_PLACEHOLDER,
      clickHrefs,
      templateConfig,
      bodyText: copy?.bodyEn,
      preheader: copy?.preheaderEn,
      headline: copy?.subjectEn,
    }),
    htmlEt: renderSeptemberCampaignHtml({
      language: "et",
      logoUrl,
      openPixelUrl: OPEN_PIXEL_PLACEHOLDER,
      clickHrefs,
      templateConfig,
      bodyText: copy?.bodyEt,
      preheader: copy?.preheaderEt,
      headline: copy?.subjectEt,
    }),
  };
}

export function applyTrackingToHtml(
  html: string,
  opts: { openPixelUrl: string; clickUrls: Record<string, string>; unsubscribeUrl?: string },
): string {
  let next = html.replaceAll(OPEN_PIXEL_PLACEHOLDER, opts.openPixelUrl);
  if (opts.unsubscribeUrl) {
    next = next.replaceAll(UNSUBSCRIBE_PLACEHOLDER, opts.unsubscribeUrl);
  }
  for (const [key, url] of Object.entries(opts.clickUrls)) {
    next = next.replaceAll(clickPlaceholder(key), url);
  }
  return next;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hrefsInHtml(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}
