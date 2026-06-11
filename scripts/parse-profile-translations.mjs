import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extractDir = path.join(root, "profile_trans_extract");

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
const cellRe = /<c r="([A-Z]+)(\d+)"[^>]*?(?: t="s")?[^>]*><v>(\d+)<\/v>/g;

for (const [, r, content] of rows) {
  const row = {};
  let cm;
  while ((cm = cellRe.exec(content))) {
    const [, col, , idx] = cm;
    row[col] = strings[Number(idx)];
  }
  if (row.A || row.D || row.E || row.G || row.J || row.K) {
    console.log(
      `R${r}\tA:${row.A ?? ""}\tD:${row.D ?? ""}\tE:${row.E ?? ""}\tG:${row.G ?? ""}\tJ:${row.J ?? ""}\tK:${row.K ?? ""}`,
    );
  }
}
