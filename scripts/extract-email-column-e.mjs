/**
 * Re-extract Column E from EST and ENG texts.xlsx → src/lib/email-templates/excel-e-content.json
 * Run: node scripts/extract-email-column-e.mjs
 */
import fs from "fs";
import XLSX from "xlsx";

const wb = XLSX.readFile("EST and ENG texts.xlsx");
const ws = wb.Sheets["Automated emails"];

function cell(row) {
  const c = ws[`E${row}`];
  return c ? String(c.w ?? c.v ?? "").trim() : "";
}

const templates = [
  ["profile_verified_subject", 5],
  ["profile_verified_body", 6],
  ["membership_activated_subject", 8],
  ["membership_activated_body", 9],
  ["request_sent_parent_subject", 12],
  ["request_sent_parent_body", 13],
  ["request_sent_friend_subject", 15],
  ["request_sent_friend_body", 16],
  ["request_received_parent_subject", 19],
  ["request_received_parent_body", 20],
  ["request_received_friend_subject", 22],
  ["request_received_friend_body", 23],
  ["declined_by_you_parent_subject", 25],
  ["declined_by_you_parent_body", 26],
  ["declined_by_you_friend_subject", 28],
  ["declined_by_you_friend_body", 29],
  ["declined_notify_parent_subject", 31],
  ["declined_notify_parent_body", 32],
  ["declined_notify_friend_subject", 34],
  ["declined_notify_friend_body", 35],
  ["confirmed_parent_subject", 38],
  ["confirmed_parent_body", 39],
  ["confirmed_friend_subject", 41],
  ["confirmed_friend_body", 42],
  ["review_parent_subject", 45],
  ["review_parent_body", 46],
  ["review_friend_subject", 48],
  ["review_friend_body", 49],
  ["membership_renewal_subject", 51],
  ["membership_renewal_body", 52],
  ["membership_expiry_subject", 54],
  ["membership_expiry_body", 55],
  ["booking_tomorrow_subject", 57],
  ["booking_tomorrow_parent_body", 58],
  ["booking_tomorrow_friend_body", 61],
  ["new_message_subject", 63],
  ["new_message_body", 64],
];

const out = {};
for (const [key, row] of templates) {
  out[key] = { row, text: cell(row) };
}

fs.writeFileSync(
  "src/lib/email-templates/excel-e-content.json",
  JSON.stringify(out, null, 2),
  "utf8",
);
console.log(`Wrote ${Object.keys(out).length} Column E entries`);
