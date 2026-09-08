import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.dirname(fileURLToPath(import.meta.url));
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  defaultViewport: { width: 1440, height: 900 },
  args: ["--no-sandbox"],
});

async function dismissCookies(page) {
  const buttons = await page.$$("button");
  for (const b of buttons) {
    const text = await page.evaluate((el) => el.textContent ?? "", b);
    if (/accept all|nõustu kõigega/i.test(text)) {
      await b.click();
      await new Promise((r) => setTimeout(r, 500));
      return;
    }
  }
}

async function scrollTo(page, selector) {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.$eval(selector, (el) => el.scrollIntoView({ block: "center" }));
  await new Promise((r) => setTimeout(r, 400));
}

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file });
  console.log("wrote", file);
}

const page = await browser.newPage();
page.setDefaultTimeout(25000);

await page.goto("http://localhost:3000/find-care", { waitUntil: "networkidle0" });
await dismissCookies(page);
await scrollTo(page, "#filter-friend-care-location");
await shot(page, "01-find-care-filter-en.png");

await page.goto("http://localhost:3000/find-pets", { waitUntil: "networkidle0" });
await dismissCookies(page);
await scrollTo(page, "#filter-care-location");
await shot(page, "02-find-pets-filter-en.png");

await page.evaluate(() => localStorage.setItem("swmp-locale", "et"));
await page.goto("http://localhost:3000/find-care", { waitUntil: "networkidle0" });
await dismissCookies(page);
await scrollTo(page, "#filter-friend-care-location");
await shot(page, "03-find-care-filter-et.png");

await page.goto("http://localhost:3000/profile/setup", { waitUntil: "networkidle0" });
await dismissCookies(page);
await shot(page, "04-profile-setup.png");

await page.goto("http://localhost:3000/profile/edit", { waitUntil: "networkidle0" });
await dismissCookies(page);
await shot(page, "04b-profile-edit.png");

await page.setViewport({ width: 390, height: 844 });
await page.evaluate(() => localStorage.setItem("swmp-locale", "en"));
await page.goto("http://localhost:3000/find-pets", { waitUntil: "networkidle0" });
await dismissCookies(page);
await scrollTo(page, "#filter-care-location");
await shot(page, "05-find-pets-filter-mobile.png");

await browser.close();
