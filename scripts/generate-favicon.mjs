/**
 * One-off: build src/app/icon.png and src/app/favicon.ico from brand paw logo.
 * Usage: node scripts/generate-favicon.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = resolve(import.meta.dirname, "..");
const source = resolve(
  root,
  "public/images/logo full/PNG/SWMP_logo-02_portrate.png",
);

async function loadTransparentSquare(size) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 24 && g < 24 && b < 24) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
}

const iconPath = resolve(root, "src/app/icon.png");
await (await loadTransparentSquare(512)).png().toFile(iconPath);

const faviconSizes = [16, 32, 48];
const faviconBuffers = await Promise.all(
  faviconSizes.map(async (size) => (await loadTransparentSquare(size)).png().toBuffer()),
);

const ico = await pngToIco(faviconBuffers);
writeFileSync(resolve(root, "src/app/favicon.ico"), ico);

console.info("[generate-favicon] wrote", iconPath);
console.info("[generate-favicon] wrote src/app/favicon.ico");
