/**
 * Dump parsed articles from Excel for verification
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extractDir = path.join(root, ".xlsx-extract-ESTandENGtextsxlsx");

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

const ARTICLE_SLUGS = {
  1: null,
  2: "choose-the-right-pet-friend",
  3: "borrowing-a-dog-what-you-need-to-know",
  4: "introduce-your-pet-to-new-pet-friend-safely",
  5: "building-trust-as-a-pet-friend",
  6: "understanding-pet-body-language",
  7: "pet-routines-that-keep-everyone-happy",
  8: "prepare-your-home-for-a-visiting-pet",
  9: "what-to-do-if-a-pet-gets-homesick",
  10: "emergency-basics-every-pet-friend-should-know",
};

function parseArticles(rows) {
  const maxR = Math.max(...Object.keys(rows).map(Number), 0);
  const articles = [];
  let current = null;

  for (let r = 1; r <= maxR; r++) {
    const colA = getCell(rows, r, 1);
    const colB = getCell(rows, r, 2);
    const colD = getCell(rows, r, 4);
    const status = getCell(rows, r, 6);

    const headerMatch = colA.match(/^(\d+)\.0$/);
    if (headerMatch) {
      if (current) articles.push(current);
      const num = Number(headerMatch[1]);
      current = {
        number: num,
        slug: ARTICLE_SLUGS[num] ?? null,
        titleEn: colB,
        titleEt: colD || null,
        bodyEn: "",
        bodyEt: null,
      };
      continue;
    }

    if (!current) continue;

    const en = colB || (colA && !/^\d+\.0$/.test(colA) ? colA : "");
    const et = colD || null;
    if (!en || en === current.titleEn) continue;

    const prefer =
      !current.bodyEn ||
      status === "ok" ||
      (en.includes("\n") && en.length >= current.bodyEn.length);

    if (prefer) {
      current.bodyEn = en;
      if (et) current.bodyEt = et;
    }
  }
  if (current) articles.push(current);

  return {
    pageTitleEn: getCell(rows, 1, 1),
    pageTitleEt: getCell(rows, 1, 4),
    pageSubtitleEn: getCell(rows, 2, 1),
    pageSubtitleEt: getCell(rows, 2, 4),
    articles: articles.filter((a) => a.slug),
  };
}

const strings = parseSharedStrings(
  fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8"),
);
const rows = parseSheet(
  fs.readFileSync(path.join(extractDir, "xl/worksheets/sheet11.xml"), "utf8"),
  strings,
);
const parsed = parseArticles(rows);

console.log(JSON.stringify(parsed, null, 2).slice(0, 8000));
