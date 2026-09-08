import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.dirname(fileURLToPath(import.meta.url));

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

async function clickByText(page, re) {
  const buttons = await page.$$("button");
  for (const b of buttons) {
    const text = await page.evaluate((el) => (el.textContent ?? "").trim(), b);
    if (re.test(text)) {
      await b.click();
      await new Promise((r) => setTimeout(r, 600));
      return true;
    }
  }
  return false;
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

await page.setViewport({ width: 390, height: 844 });
await page.goto("http://localhost:3000/find-pets", { waitUntil: "networkidle0" });
await dismissCookies(page);
await clickByText(page, /show filters|näita filtreid/i);
await scrollTo(page, "#filter-care-location");
await shot(page, "05-find-pets-filter-mobile.png");

await page.setViewport({ width: 1440, height: 900 });
await page.evaluate(() => localStorage.setItem("swmp-locale", "et"));
await page.goto("http://localhost:3000/find-pets", { waitUntil: "networkidle0" });
await dismissCookies(page);
await scrollTo(page, "#filter-care-location");
await shot(page, "06-find-pets-filter-et.png");

await browser.close();
