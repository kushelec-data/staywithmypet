/**
 * Regenerates site text modules from EST and ENG texts.xlsx
 * Run: node scripts/sync-site-texts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const xlsxPath = path.join(root, "EST and ENG texts.xlsx");
const outSiteTexts = path.join(root, "src/lib/site-texts.ts");
const outEn = path.join(root, "src/i18n/generated/site-en.ts");
const outEt = path.join(root, "src/i18n/generated/site-et.ts");
const outMissing = path.join(root, "src/i18n/generated/site-missing-translations.json");
const zipPath = path.join(root, ".site-texts-sync.zip");
const extractDir = path.join(root, ".site-texts-sync");

const SKIP_PATTERNS = [
  /^ENG$/i,
  /^EST$/i,
  /^English$/i,
  /^Estonian$/i,
  /^Comment$/i,
  /^Kommentaar$/i,
  /vaja kohendada/i,
  /^Seda ma ei lisanud/i,
  /^Ingliskeelset teksti on vaja/i,
  /^O$/,
  /^\[DD Month/i,
  /^\[PP kuu/i,
  /^ENG \(/i,
];

function esc(s) {
  return JSON.stringify(s);
}

function shouldSkip(text) {
  const t = (text ?? "").trim();
  if (!t || t.length < 2) return true;
  return SKIP_PATTERNS.some((p) => p.test(t));
}

function parseSharedStrings(xml) {
  const strings = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) {
    const texts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) =>
      x[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"'),
    );
    strings.push(texts.join(""));
  }
  return strings;
}

function col(s) {
  let n = 0;
  for (const c of s) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

function parseSheet(xml, strings) {
  const rows = {};
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const r = +rm[1];
    rows[r] = {};
    const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cellRe.exec(rm[2]))) {
      const cell = cm[3] + cm[4];
      let val = "";
      if (cell.match(/t="s"/)) {
        const v = cell.match(/<v>(\d+)<\/v>/);
        val = v ? strings[+v[1]] : "";
      } else if (cell.match(/t="inlineStr"/)) {
        const is = cell.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        val = is ? is[1] : "";
      } else {
        const v = cell.match(/<v>([^<]*)<\/v>/);
        val = v ? v[1] : "";
      }
      rows[r][col(cm[1])] = val;
    }
  }
  return rows;
}

function getCell(rows, r, c) {
  return (rows[r]?.[c] ?? "").trim();
}

function extractBDPairs(rows, maxRow) {
  const blocks = [];
  for (let r = 1; r <= maxRow; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4);
    if (shouldSkip(en) && shouldSkip(et)) continue;
    if (en && !shouldSkip(en)) blocks.push({ en, et: et && !shouldSkip(et) ? et : null });
    else if (et && !shouldSkip(et)) blocks.push({ en: null, et });
  }
  return blocks;
}

function extractNavPairs(rows) {
  const pairs = [];
  for (let r = 3; r <= 12; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4) || getCell(rows, r, 3);
    if (!en || shouldSkip(en) || en.length > 60) continue;
    if (et && !shouldSkip(et)) pairs.push([en, et]);
  }
  return pairs;
}

function parseFaq(rows) {
  const maxR = Math.max(...Object.keys(rows).map(Number), 0);
  const titleEn = getCell(rows, 2, 2) || "Frequently Asked Questions (FAQ)";
  const titleEt = getCell(rows, 2, 4) || null;
  const subtitleEn = getCell(rows, 4, 2) || "";
  const subtitleEt = getCell(rows, 4, 4) || null;

  const items = [];
  let currentQ = null;
  for (let r = 1; r <= maxR; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4);
    if (!en || shouldSkip(en)) continue;
    const isQuestion =
      /^\d+\.\s/.test(en) ||
      (en.endsWith("?") && en.length < 120 && !en.includes("\n"));
    if (isQuestion) {
      if (currentQ) items.push(currentQ);
      currentQ = { questionEn: en.replace(/^\d+\.\s*/, ""), questionEt: et || null, answerEn: "", answerEt: null };
    } else if (currentQ && !currentQ.answerEn) {
      currentQ.answerEn = en;
      currentQ.answerEt = et || null;
    } else if (currentQ && currentQ.answerEn && en.length > 20) {
      currentQ.answerEn += "\n\n" + en;
      if (et) currentQ.answerEt = (currentQ.answerEt ? currentQ.answerEt + "\n\n" : "") + et;
    }
  }
  if (currentQ) items.push(currentQ);
  return { titleEn, titleEt, subtitleEn, subtitleEt, items };
}

function parseHowItWorks(rows) {
  const maxR = Math.max(...Object.keys(rows).map(Number), 0);
  const titleEt = getCell(rows, 1, 2);
  const titleEn = "How It Works";
  const subtitleEt = getCell(rows, 2, 2);
  const subtitleEn = "A step-by-step guide to sharing love and care";
  const introEt = getCell(rows, 3, 2);
  const introEn =
    "Stay With My Pet makes connecting pet parents and pet friends simple, safe, and joyful.";

  const parentSteps = [];
  const friendSteps = [];
  for (let r = 1; r <= maxR; r++) {
    const stepNum = getCell(rows, r, 1);
    if (!/^\d/.test(stepNum)) continue;
    const parentTitleEt = getCell(rows, r, 2);
    const friendTitleEt = getCell(rows, r, 3);
    const parentTitleEn = getCell(rows, r, 5);
    const friendTitleEn = getCell(rows, r, 6);
    const parentBodyEt = getCell(rows, r + 1, 2);
    const friendBodyEt = getCell(rows, r + 1, 3);
    const parentBodyEn = getCell(rows, r + 1, 5);
    const friendBodyEn = getCell(rows, r + 1, 6);
    if (parentTitleEn || parentTitleEt) {
      parentSteps.push({
        titleEn: parentTitleEn || parentTitleEt,
        titleEt: parentTitleEt || null,
        bodyEn: parentBodyEn || parentBodyEt,
        bodyEt: parentBodyEt || null,
      });
    }
    if (friendTitleEn || friendTitleEt) {
      friendSteps.push({
        titleEn: friendTitleEn || friendTitleEt,
        titleEt: friendTitleEt || null,
        bodyEn: friendBodyEn || friendBodyEt,
        bodyEt: friendBodyEt || null,
      });
    }
  }
  return { titleEn, titleEt, subtitleEn, subtitleEn, introEn, introEt, parentSteps, friendSteps };
}

function parseOpeningPage(rows) {
  // Opening page layout: col A = English, col E = Estonian (cols B/F are alternates)
  const heroTitleEn = getCell(rows, 6, 1);
  const heroTitleEt = getCell(rows, 6, 5) || getCell(rows, 6, 2) || null;
  const heroSubtitleEn = getCell(rows, 7, 1);
  const heroSubtitleEt = getCell(rows, 7, 5) || getCell(rows, 7, 6) || null;
  const eyebrowEn = getCell(rows, 11, 1) || "ESTONIA'S FIRST PET SHARING COMMUNITY";
  const eyebrowEt = getCell(rows, 11, 5) || null;

  const trust = [];
  for (let r = 12; r <= 13; r++) {
    const en = getCell(rows, r, 1);
    const et = getCell(rows, r, 5);
    if (en && en.length < 80) trust.push({ en, et: et || null });
  }

  return { eyebrowEn, eyebrowEt, heroTitleEn, heroTitleEt, heroSubtitleEn, heroSubtitleEt, trust };
}

function parseAbout(rows) {
  const maxR = Math.max(...Object.keys(rows).map(Number), 0);
  const sections = { titleEn: "", titleEt: null, subtitleEn: "", subtitleEt: null, mission: [], story: [] };
  for (let r = 1; r <= maxR; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4);
    if (r === 2) {
      sections.titleEn = en;
      sections.titleEt = et || null;
      continue;
    }
    if (r === 3) {
      sections.subtitleEn = en;
      sections.subtitleEt = et || null;
      continue;
    }
    if (!en || shouldSkip(en)) continue;
    if (en === "Our Mission" || en === "Our Story") continue;
    if (r < 12) sections.mission.push({ en, et: et || null });
    else if (r >= 14) sections.story.push({ en, et: et || null });
  }
  return sections;
}

function parseContact(rows) {
  const labels = {};
  const map = [
    ["Contact Us", "title"],
    ["Get in Touch", "badge"],
    ["Questions, ideas", "subtitle"],
    ["Send us a Message", "formHeading"],
    ["Full Name", "fullName"],
    ["Email Address", "email"],
    ["Subject", "subject"],
    ["Message", "message"],
    ["Send Message", "submit"],
  ];
  for (let r = 1; r <= 30; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4);
    for (const [prefix, key] of map) {
      if (en.startsWith(prefix)) {
        labels[key] = { en, et: et || null };
      }
    }
  }
  return labels;
}

function parseClinics(rows) {
  const disclaimer = [];
  for (let r = 14; r <= 30; r++) {
    const en = getCell(rows, r, 2);
    const et = getCell(rows, r, 4);
    if (!en || en.length < 20) continue;
    if (/^Important note/i.test(en)) continue;
    disclaimer.push({ en, et: et || null });
  }
  return {
    titleEn: getCell(rows, 2, 2) || "Nearby Veterinary Clinics in Estonia",
    titleEt: getCell(rows, 2, 4) || null,
    subtitleEn: getCell(rows, 3, 2) || "",
    subtitleEt: getCell(rows, 3, 4) || null,
    introEn: getCell(rows, 6, 2) || getCell(rows, 5, 2) || "",
    introEt: getCell(rows, 6, 4) || getCell(rows, 5, 4) || null,
    sectionTitleEn: getCell(rows, 5, 2) || "Trusted Pet Clinics Near You",
    sectionTitleEt: getCell(rows, 5, 4) || null,
    disclaimerTitleEn: getCell(rows, 13, 2) || "Important note about clinic information",
    disclaimerTitleEt: getCell(rows, 13, 4) || null,
    disclaimer,
  };
}

// --- extract xlsx ---
if (!fs.existsSync(xlsxPath)) {
  console.error("Missing:", xlsxPath);
  process.exit(1);
}
if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
fs.copyFileSync(xlsxPath, zipPath);
fs.mkdirSync(extractDir, { recursive: true });
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

const strings = parseSharedStrings(fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8"));
const wb = fs.readFileSync(path.join(extractDir, "xl/workbook.xml"), "utf8");
const sheetNames = [...wb.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);

function loadSheet(index) {
  const xml = fs.readFileSync(path.join(extractDir, `xl/worksheets/sheet${index}.xml`), "utf8");
  return parseSheet(xml, strings);
}

const sheetIndex = Object.fromEntries(sheetNames.map((n, i) => [n, i + 1]));
const howItWorks = parseHowItWorks(loadSheet(sheetIndex["How it works"]));
const faq = parseFaq(loadSheet(sheetIndex["FAQ"]));
const opening = parseOpeningPage(loadSheet(sheetIndex["Opening page"]));
const about = parseAbout(loadSheet(sheetIndex["Our Story"]));
const contact = parseContact(loadSheet(sheetIndex["Contact Us"]));
const clinics = parseClinics(loadSheet(sheetIndex["Clinics"]));
const headerFooterRows = loadSheet(sheetIndex["Header and footer"]);
const navPairs = extractNavPairs(headerFooterRows);
const footerTaglineEn = getCell(headerFooterRows, 13, 2);
const footerTaglineEt = getCell(headerFooterRows, 13, 3) || getCell(headerFooterRows, 13, 4) || null;

const privacyRows = loadSheet(sheetIndex["privacy policy"]);
const termsRows = loadSheet(sheetIndex["Terms of Use"]);
const safetyRows = loadSheet(sheetIndex["Safety guidelines"]);

const privacyMax = Math.max(...Object.keys(privacyRows).map(Number), 0);
const termsMax = Math.max(...Object.keys(termsRows).map(Number), 0);
const safetyMax = Math.max(...Object.keys(safetyRows).map(Number), 0);

const privacy = extractBDPairs(privacyRows, privacyMax);
const terms = extractBDPairs(termsRows, termsMax);
const safety = extractBDPairs(safetyRows, safetyMax);

const missingEt = [];

function track(key, en, et) {
  if (en && !et) missingEt.push({ key, en });
  return et ?? en;
}

function navEt(...keys) {
  for (const key of keys) {
    const hit = navPairs.find(([en]) => en === key);
    if (hit?.[1]) return hit[1];
  }
  return null;
}

const navbarOverridesEn = {
  home: "Home",
  about: "About Us",
  howItWorks: "How It Works",
  articles: "Articles",
  contact: "Contact Us",
  findCare: "Find Care",
  findPets: "Find Pets",
  findPetFriends: "Find Pet Friends",
  searchPets: "Search pets",
  pricing: "Pricing",
  faq: "FAQ",
  login: "Log in",
  getStarted: "Sign up",
};

const navbarOverridesEt = {
  home: track("navbar.home", navbarOverridesEn.home, navEt("Home")),
  about: track("navbar.about", navbarOverridesEn.about, navEt("About Us")),
  howItWorks: track("navbar.howItWorks", navbarOverridesEn.howItWorks, navEt("How It Works", "How it works")),
  articles: track("navbar.articles", navbarOverridesEn.articles, navEt("Articles")),
  contact: track("navbar.contact", navbarOverridesEn.contact, navEt("Contact Us")),
  findCare: track("navbar.findCare", navbarOverridesEn.findCare, navEt("Find Care", "Find care")),
  findPets: track("navbar.findPets", navbarOverridesEn.findPets, navEt("Find Pets", "Search pets")),
  findPetFriends: track("navbar.findPetFriends", navbarOverridesEn.findPetFriends, navEt("Find Pet Friends")),
  searchPets: track("navbar.searchPets", navbarOverridesEn.searchPets, navEt("Search pets")),
  pricing: track("navbar.pricing", navbarOverridesEn.pricing, navEt("Pricing")),
  faq: track("navbar.faq", navbarOverridesEn.faq, navEt("FAQ")),
  login: track("navbar.login", navbarOverridesEn.login, navEt("Log in", "Login")),
  getStarted: track("navbar.getStarted", navbarOverridesEn.getStarted, navEt("Sign up", "Get Started")),
};

// Build FAQ items for i18n
const faqItemsEn = faq.items.map((item) => ({
  question: item.questionEn,
  answer: item.answerEn,
}));
const faqItemsEt = faq.items.map((item, i) => {
  const q = track(`faq.items[${i}].question`, item.questionEn, item.questionEt);
  const a = track(`faq.items[${i}].answer`, item.answerEn, item.answerEt);
  return { question: q, answer: a };
});

const howItWorksExplainerEn = {
  heading: howItWorks.titleEn,
  subheading: howItWorks.introEn,
  petParent: {
    title: "For Pet Parents",
    description: howItWorks.parentSteps.map((s) => s.bodyEn).filter(Boolean).join(" "),
    cta: navbarOverridesEn.findCare,
  },
  petFriend: {
    title: "For Pet Friends",
    description: howItWorks.friendSteps.map((s) => s.bodyEn).filter(Boolean).join(" "),
    cta: navbarOverridesEn.findPets,
  },
};

const howItWorksExplainerEt = {
  heading: track("howItWorksPage.explainerSection.heading", howItWorks.titleEn, howItWorks.titleEt),
  subheading: track("howItWorksPage.explainerSection.subheading", howItWorks.introEn, howItWorks.introEt),
  petParent: {
    title: track("howItWorksPage.explainerSection.petParent.title", "For Pet Parents", "Loomaomanikule"),
    description: howItWorks.parentSteps.map((s) => track("howItWorks.parent", s.bodyEn, s.bodyEt) || s.bodyEn).join(" "),
    cta: navbarOverridesEt.findCare,
  },
  petFriend: {
    title: track("howItWorksPage.explainerSection.petFriend.title", "For Pet Friends", "Loomasõbrale"),
    description: howItWorks.friendSteps.map((s) => track("howItWorks.friend", s.bodyEn, s.bodyEt) || s.bodyEn).join(" "),
    cta: navbarOverridesEt.findPets,
  },
};

const siteEnPartial = {
  navbar: navbarOverridesEn,
  footer: {
    tagline: footerTaglineEn || undefined,
    groups: {
      company: {
        vetClinics: "Vet clinics",
        terms: "Terms of Use",
        privacy: "Privacy Policy",
        safety: "Safety Guidelines",
      },
    },
  },
  hero: {
    eyebrow: opening.eyebrowEn || undefined,
    title: opening.heroTitleEn || undefined,
    subtitle: opening.heroSubtitleEn || undefined,
  },
  faq: {
    badge: "FAQ",
    title: faq.titleEn.replace(/\s*\(FAQ\)\s*/i, "").trim(),
    subtitle: faq.subtitleEn,
    items: faqItemsEn,
  },
  about: {
    badge: "About us",
    title: about.subtitleEn || about.titleEn,
    subtitle: about.subtitleEn || "",
    missionTitle: "Our Mission",
    missionParagraphs: about.mission.map((p) => p.en),
    storyTitle: "Our Story",
    storyParagraphs: about.story.map((p) => p.en),
  },
  howItWorksPage: {
    title: howItWorks.titleEn,
    subtitle: howItWorks.subtitleEn,
    explainerSection: howItWorksExplainerEn,
  },
  contact: {
    badge: contact.badge?.en?.split("?")[0]?.trim() || "Get in Touch",
    title: contact.title?.en || "Contact Us",
    subtitle: contact.subtitle?.en || "",
    fullName: contact.fullName?.en || "Full Name",
    email: contact.email?.en || "Email Address",
    subject: contact.subject?.en || "Subject",
    message: contact.message?.en || "Message",
    sendMessage: contact.submit?.en || "Send Message",
  },
  common: {
    sendMessage: contact.submit?.en || "Send Message",
  },
  vetClinics: {
    badge: "Pet safety",
    title: clinics.titleEn,
    subtitle: clinics.subtitleEn,
    intro: clinics.introEn,
    sectionTitle: clinics.sectionTitleEn,
    disclaimerTitle: clinics.disclaimerTitleEn,
    disclaimer: clinics.disclaimer.map((d) => d.en),
  },
  legal: {
    privacy: { title: privacy.find((p) => p.en?.includes("Privacy Policy"))?.en || "Privacy Policy" },
    terms: { title: terms.find((p) => p.en?.includes("Terms of Use"))?.en || "Terms of Use" },
    safety: { title: safety.find((p) => p.en?.includes("Safety"))?.en || "Safety Guidelines" },
  },
};

const siteEtPartial = {
  navbar: navbarOverridesEt,
  footer: {
    tagline: track("footer.tagline", footerTaglineEn, footerTaglineEt),
    groups: {
      company: {
        vetClinics: track("footer.vetClinics", "Vet clinics", "Loomakliinikud"),
        terms: track("footer.terms", "Terms of Use", terms.find((p) => p.en?.includes("Terms"))?.et || getCell(termsRows, 2, 4)?.split("—").pop()?.trim()),
        privacy: track("footer.privacy", "Privacy Policy", privacy.find((p) => p.en?.includes("Privacy"))?.et || getCell(privacyRows, 1, 4)),
        safety: track("footer.safety", "Safety Guidelines", safety.find((p) => p.en?.includes("Safety"))?.et || getCell(safetyRows, 2, 3)),
      },
    },
  },
  hero: {
    eyebrow: track("hero.eyebrow", opening.eyebrowEn, opening.eyebrowEt),
    title: track("hero.title", opening.heroTitleEn, opening.heroTitleEt),
    subtitle: track("hero.subtitle", opening.heroSubtitleEn, opening.heroSubtitleEt),
  },
  faq: {
    badge: "KKK",
    title: track("faq.title", faq.titleEn, faq.titleEt?.replace(/\s*\(KKK\)\s*/i, "").trim()),
    subtitle: track("faq.subtitle", faq.subtitleEn, faq.subtitleEt),
    items: faqItemsEt,
  },
  about: {
    badge: track("about.badge", "About us", about.titleEt),
    title: track("about.title", about.subtitleEn, about.subtitleEt),
    subtitle: track("about.subtitle", about.subtitleEn, about.subtitleEt),
    missionTitle: track("about.missionTitle", "Our Mission", "Meie missioon"),
    missionParagraphs: about.mission.map((p, i) => track(`about.mission[${i}]`, p.en, p.et)),
    storyTitle: track("about.storyTitle", "Our Story", "Meie lugu"),
    storyParagraphs: about.story.map((p, i) => track(`about.story[${i}]`, p.en, p.et)),
  },
  howItWorksPage: {
    title: track("howItWorksPage.title", howItWorks.titleEn, howItWorks.titleEt),
    subtitle: track("howItWorksPage.subtitle", howItWorks.subtitleEn, howItWorks.subtitleEt),
    explainerSection: howItWorksExplainerEt,
  },
  contact: {
    badge: track("contact.badge", contact.badge?.en, contact.badge?.et),
    title: track("contact.title", contact.title?.en, contact.title?.et),
    subtitle: track("contact.subtitle", contact.subtitle?.en, contact.subtitle?.et),
    fullName: track("contact.fullName", contact.fullName?.en, contact.fullName?.et),
    email: track("contact.email", contact.email?.en, contact.email?.et),
    subject: track("contact.subject", contact.subject?.en, contact.subject?.et),
    message: track("contact.message", contact.message?.en, contact.message?.et),
    sendMessage: track("contact.sendMessage", contact.submit?.en, contact.submit?.et),
  },
  common: {
    sendMessage: track("common.sendMessage", contact.submit?.en, contact.submit?.et),
  },
  vetClinics: {
    badge: track("vetClinics.badge", "Pet safety", "Lemmiku turvalisus"),
    title: track("vetClinics.title", clinics.titleEn, clinics.titleEt),
    subtitle: track("vetClinics.subtitle", clinics.subtitleEn, clinics.subtitleEt),
    intro: track("vetClinics.intro", clinics.introEn, clinics.introEt),
    sectionTitle: track("vetClinics.sectionTitle", clinics.sectionTitleEn, clinics.sectionTitleEt),
    disclaimerTitle: track(
      "vetClinics.disclaimerTitle",
      clinics.disclaimerTitleEn,
      clinics.disclaimerTitleEt,
    ),
    disclaimer: clinics.disclaimer.map((d, i) =>
      track(`vetClinics.disclaimer[${i}]`, d.en, d.et),
    ),
  },
  legal: {
    privacy: { title: track("legal.privacy.title", "Privacy Policy", privacy.find((p) => p.en?.includes("Privacy"))?.et || getCell(privacyRows, 1, 4)) },
    terms: { title: track("legal.terms.title", "Terms of Use", getCell(termsRows, 2, 4)?.split("—").pop()?.trim() || terms.find((p) => p.en?.includes("Terms"))?.et) },
    safety: { title: track("legal.safety.title", "Safety Guidelines", getCell(safetyRows, 2, 3)) },
  },
};

function formatLegalBlocks(blocks) {
  return blocks
    .filter((b) => b.en && !shouldSkip(b.en))
    .map((b) => ({
      en: b.en,
      et: b.et && !shouldSkip(b.et) ? b.et : null,
    }));
}

const legalDocs = {
  privacy: {
    titleEn: siteEnPartial.legal.privacy.title,
    titleEt: siteEtPartial.legal.privacy.title,
    blocks: formatLegalBlocks(privacy),
  },
  terms: {
    titleEn: siteEnPartial.legal.terms.title,
    titleEt: siteEtPartial.legal.terms.title,
    blocks: formatLegalBlocks(terms),
  },
  safety: {
    titleEn: siteEnPartial.legal.safety.title,
    titleEt: siteEtPartial.legal.safety.title,
    blocks: formatLegalBlocks(safety),
  },
};

for (const doc of Object.values(legalDocs)) {
  for (const block of doc.blocks) {
    if (!block.et) missingEt.push({ key: `legal.${doc.titleEn}`, en: block.en.slice(0, 80) });
  }
}

function emitObj(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  if (obj === undefined) return "undefined";
  if (obj === null) return "null";
  if (typeof obj === "string") return esc(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return `[\n${obj.map((v) => `${pad}  ${emitObj(v, indent + 1)},`).join("\n")}\n${pad}]`;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([k, v]) => `${pad}  ${/^[a-zA-Z_$][\w$]*$/.test(k) ? k : esc(k)}: ${emitObj(v, indent + 1)},`)
      .join("\n")}\n${pad}}`;
  }
  return String(obj);
}

fs.mkdirSync(path.dirname(outEn), { recursive: true });

fs.writeFileSync(
  outSiteTexts,
  `/**
 * General site & legal page text from EST and ENG texts.xlsx
 * Regenerate: node scripts/sync-site-texts.mjs
 */

import type { Locale } from "@/i18n/translations";

export type LegalBlock = { en: string; et: string | null };

export type LegalDocument = {
  titleEn: string;
  titleEt: string;
  blocks: LegalBlock[];
};

export const legalDocuments = ${emitObj(legalDocs)} as const;

export function getLegalDocument(slug: keyof typeof legalDocuments, locale: Locale): {
  title: string;
  paragraphs: string[];
} {
  const doc = legalDocuments[slug];
  const title = locale === "et" ? doc.titleEt : doc.titleEn;
  const paragraphs = doc.blocks.map((b) => (locale === "et" && b.et ? b.et : b.en));
  return { title, paragraphs };
}
`,
);

fs.writeFileSync(
  outEn,
  `/** Auto-generated from EST and ENG texts.xlsx — do not edit */
export const siteEnPartial = ${emitObj(siteEnPartial)} as const;
`,
);

fs.writeFileSync(
  outEt,
  `/** Auto-generated from EST and ENG texts.xlsx — do not edit */
export const siteEtPartial = ${emitObj(siteEtPartial)} as const;
`,
);

fs.writeFileSync(outMissing, JSON.stringify(missingEt, null, 2));

console.log(`Wrote ${outSiteTexts}`);
console.log(`Wrote ${outEn} / ${outEt}`);
console.log(`FAQ items: ${faq.items.length}`);
console.log(`Privacy blocks: ${legalDocs.privacy.blocks.length}`);
console.log(`Terms blocks: ${legalDocs.terms.blocks.length}`);
console.log(`Safety blocks: ${legalDocs.safety.blocks.length}`);
console.log(`Missing ET entries: ${missingEt.length}`);
