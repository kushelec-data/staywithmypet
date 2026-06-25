import type { EmailLocale } from "@/lib/email-templates/locale";
import { emailCtx } from "@/lib/emails/context";
import { absoluteUrl, ctaButton, paragraph, wrapEmail } from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

type LocaleCopy = { et: string; en: string };

function pick(copy: LocaleCopy, locale: EmailLocale): string {
  return locale === "et" ? copy.et : copy.en;
}

function buildProfileEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
  options: {
    subject: LocaleCopy;
    headline: LocaleCopy;
    paragraphs: LocaleCopy[];
    cta: { label: LocaleCopy; href: string };
  },
): EmailTemplate {
  const { name } = emailCtx(ctx);
  const greeting = pick({ et: `Tere, ${name},`, en: `Hi ${name},` }, locale);

  const bodyParagraphs = [
    paragraph(greeting),
    ...options.paragraphs.map((copy) => paragraph(pick(copy, locale))),
    ctaButton(pick(options.cta.label, locale), options.cta.href),
    paragraph(
      pick(
        {
          et: "Küsimuste korral kirjuta meile: info@staywithmypet.ee",
          en: "Questions? We're happy to help at info@staywithmypet.ee",
        },
        locale,
      ),
    ),
    paragraph(
      pick(
        {
          et: "Parimate soovidega<br /><br />Stay With My Pet meeskond",
          en: "Warm regards,<br /><br />The Stay With My Pet Team",
        },
        locale,
      ),
    ),
  ];

  const subject = pick(options.subject, locale);
  const headline = pick(options.headline, locale);
  const html = wrapEmail(bodyParagraphs.join(""), headline, { includeFooter: false });

  const plainParagraphs = [
    headline,
    "",
    greeting,
    ...options.paragraphs.map((copy) => pick(copy, locale)),
    `${pick(options.cta.label, locale)}: ${options.cta.href}`,
    "",
    pick(
      {
        et: "Küsimuste korral kirjuta meile: info@staywithmypet.ee",
        en: "Questions? We're happy to help at info@staywithmypet.ee",
      },
      locale,
    ),
    "",
    pick(
      {
        et: "Parimate soovidega,\nStay With My Pet meeskond",
        en: "Warm regards,\nThe Stay With My Pet Team",
      },
      locale,
    ),
  ];

  return {
    subject,
    html,
    text: plainParagraphs.join("\n"),
  };
}

/** Sent when profile completeness reaches 100% (`profile_completed` event). */
export function buildProfileCompletedEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildProfileEmail(ctx, locale, {
    subject: {
      et: "🎉 Sinu StayWithMyPet profiil on valmis",
      en: "🎉 Your StayWithMyPet Profile is Complete",
    },
    headline: {
      et: "Palju õnne! Sinu profiil on valmis 🎉",
      en: "Congratulations! Your Profile is Complete 🎉",
    },
    paragraphs: [
      {
        et: "Palju õnne! Sinu StayWithMyPet profiil on nüüd valmis. Sinu profiil on nähtav ja valmis, mis teeb teistele liikmetele sinuga ühenduse võtmise lihtsamaks.",
        en: "Congratulations! Your StayWithMyPet profile is now complete. Your profile is ready and visible, making it easier for other members to connect with you.",
      },
    ],
    cta: {
      label: { et: "Vaata profiili", en: "View your profile" },
      href: absoluteUrl("/profile/edit"),
    },
  });
}

/** Reserved for future admin/manual profile verification (`profile_verified` event). */
export function buildProfileVerifiedEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildProfileEmail(ctx, locale, {
    subject: {
      et: "Sinu StayWithMyPet profiil on kinnitatud 💛",
      en: "Your StayWithMyPet Profile Has Been Verified 💛",
    },
    headline: {
      et: "Sinu profiil on kinnitatud 💛",
      en: "Your Profile Has Been Verified 💛",
    },
    paragraphs: [
      {
        et: "Stay With My Pet meeskond on sinu profiili üle vaadanud ja kinnitanud. Aitäh, et aitad meil hoida usaldusväärset ja hoolivat kogukonda.",
        en: "The Stay With My Pet team has reviewed and verified your profile. Thank you for helping us maintain a trusted and caring community.",
      },
    ],
    cta: {
      label: { et: "Mine oma kontole", en: "Go to your dashboard" },
      href: absoluteUrl("/dashboard"),
    },
  });
}
