import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extractDir = path.join(root, "listing_search_extract");

const xml = fs.readFileSync(path.join(extractDir, "xl/sharedStrings.xml"), "utf8");
const strings = [];
const re = /<si>([\s\S]*?)<\/si>/g;
let m;
while ((m = re.exec(xml))) {
  const block = m[1];
  const texts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) =>
    x[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&apos;/g, "'"),
  );
  strings.push(texts.join(""));
}

const sheet = fs.readFileSync(path.join(extractDir, "xl/worksheets/sheet1.xml"), "utf8");
const rows = [...sheet.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];
const cellRe = /<c r="([A-F])(\d+)"[^>]*?(?: t="s")?[^>]*><v>(\d+)<\/v>/g;

for (const [, r, content] of rows) {
  const row = { r };
  let cm;
  while ((cm = cellRe.exec(content))) {
    const [, col, , idx] = cm;
    row[col] = strings[Number(idx)];
  }
  if (row.A || row.E) {
    console.log(
      `R${r}\tA: ${row.A ?? ""}\tB: ${row.B ?? ""}\t|\tE: ${row.E ?? ""}\tF: ${row.F ?? ""}`,
    );
  }
}
