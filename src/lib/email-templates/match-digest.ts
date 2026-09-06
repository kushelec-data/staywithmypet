import { absoluteUrl, ctaButton, escapeHtml, wrapEmail } from "@/lib/emails/layout";
import type { EmailLocale } from "@/lib/email-templates/locale";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

function copy(locale: EmailLocale) {
  if (locale === "et") {
    return {
      parentSubject: (pet: string) => `Leidsime uusi loomasõpru lemmikule ${pet}`,
      friendSubject: "Uued lemmikud, kelle eest võiksid hoolitseda",
      introParent: (name: string, pet: string) =>
        `Tere ${name}, leidsime loomasõpru, kes võivad sobida lemmikule ${pet}.`,
      introFriend: (name: string) =>
        `Tere ${name}, leidsime lemmikuid, kelle eest võiksid hoolitseda.`,
      viewMatch: "Vaata sobivust",
      viewAll: "Vaata kõiki sobivusi",
    };
  }
  return {
    parentSubject: (pet: string) => `We found new Pet Friends for ${pet}`,
    friendSubject: "New pets you may enjoy caring for",
    introParent: (name: string, pet: string) =>
      `Hi ${name}, we found Pet Friends who may be a good fit for ${pet}.`,
    introFriend: (name: string) =>
      `Hi ${name}, we found pets you may enjoy caring for.`,
    viewMatch: "View match",
    viewAll: "View your matches",
  };
}

export function buildMatchDigestEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  const t = copy(locale);
  const name = ctx.recipientName?.trim() || (locale === "et" ? "liige" : "there");
  const pet = ctx.petName?.trim() || (locale === "et" ? "sinu lemmik" : "your pet");
  const kind = ctx.matchDigestKind === "parent" ? "parent" : "friend";
  const subject = kind === "parent" ? t.parentSubject(pet) : t.friendSubject;
  const intro = kind === "parent" ? t.introParent(name, pet) : t.introFriend(name);
  const items = (ctx.matchDigestItems ?? []).slice(0, 3);

  const itemHtml = items
    .map((item) => {
      const photo = item.photoUrl?.startsWith("http")
        ? `<img src="${escapeHtml(item.photoUrl)}" alt="" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:12px;" />`
        : "";
      const location = item.location ? escapeHtml(item.location) : "";
      const reason = item.reason ? escapeHtml(item.reason) : "";
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top;">
          <table cellpadding="0" cellspacing="0"><tr>
            ${photo ? `<td style="padding-right:12px;vertical-align:top;">${photo}</td>` : ""}
            <td style="vertical-align:top;">
              <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#1a1a1a;">${escapeHtml(item.name)}</p>
              ${location ? `<p style="margin:0 0 4px;font-size:13px;color:#666;">${location}</p>` : ""}
              ${reason ? `<p style="margin:0 0 8px;font-size:13px;color:#444;">${reason}</p>` : ""}
              ${ctaButton(t.viewMatch, item.href)}
            </td>
          </tr></table>
        </td>
      </tr>`;
    })
    .join("");

  const html = wrapEmail(
    `${`<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">${escapeHtml(intro)}</p>`}
     <table width="100%" cellpadding="0" cellspacing="0">${itemHtml}</table>
     ${ctaButton(t.viewAll, absoluteUrl("/matches"))}`,
    subject,
  );

  const text = [
    subject,
    "",
    intro,
    ...items.map((item) => `- ${item.name}${item.location ? ` (${item.location})` : ""}${item.reason ? `: ${item.reason}` : ""} ${item.href}`),
    "",
    `${t.viewAll}: ${absoluteUrl("/matches")}`,
  ].join("\n");

  return { subject, html, text };
}
