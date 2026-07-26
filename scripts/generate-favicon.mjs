/**
 * Build src/app/icon.png and src/app/favicon.ico from the attached paw source.
 * Usage: node scripts/generate-favicon.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "scripts/favicon-source-paw.jpg");

/** StayWithMyPet brand pink */
const BRAND_PINK = { r: 247, g: 168, b: 184 };

/** Sampled from the attached paw screenshot (salmon paw on dark tab). */
const PAW_REF = { r: 230, g: 131, b: 129 };
const BG_REF = { r: 68, g: 42, b: 28 };

/** Zoomed paw crop from the attached screenshot (left favicon only). */
const CROP = { left: 108, top: 388, width: 75, height: 88 };

const PADDING_RATIO = 0.12;

function colorDistance(r, g, b, ref) {
  return Math.hypot(r - ref.r, g - ref.g, b - ref.b);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function extractPinkPawRgba() {
  const { data, info } = await sharp(source)
    .extract(CROP)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dPaw = colorDistance(r, g, b, PAW_REF);
    const dBg = colorDistance(r, g, b, BG_REF);
    const alpha = clamp((dBg - dPaw + 18) / 36, 0, 1);

    const offset = (i / 4) * 4;
    if (alpha <= 0.04) {
      out[offset] = 0;
      out[offset + 1] = 0;
      out[offset + 2] = 0;
      out[offset + 3] = 0;
      continue;
    }

    out[offset] = BRAND_PINK.r;
    out[offset + 1] = BRAND_PINK.g;
    out[offset + 2] = BRAND_PINK.b;
    out[offset + 3] = Math.round(alpha * 255);
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim()
    .png()
    .toBuffer();
}

async function renderSquare(pawBuffer, size) {
  const pawMeta = await sharp(pawBuffer).metadata();
  const inner = Math.round(size * (1 - PADDING_RATIO * 2));
  const scale = Math.min(inner / pawMeta.width, inner / pawMeta.height);
  const width = Math.max(1, Math.round(pawMeta.width * scale));
  const height = Math.max(1, Math.round(pawMeta.height * scale));
  const left = Math.round((size - width) / 2);
  const top = Math.round((size - height) / 2);

  const resized = await sharp(pawBuffer)
    .resize(width, height, {
      fit: "inside",
      kernel: size <= 48 ? sharp.kernel.lanczos3 : sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

const pawRgba = await extractPinkPawRgba();

const iconPath = resolve(root, "src/app/icon.png");
await sharp(await renderSquare(pawRgba, 512)).toFile(iconPath);

const faviconSizes = [16, 32, 48];
const faviconBuffers = await Promise.all(
  faviconSizes.map((size) => renderSquare(pawRgba, size)),
);

const ico = await pngToIco(faviconBuffers);
writeFileSync(resolve(root, "src/app/favicon.ico"), ico);

console.info("[generate-favicon] source:", source);
console.info("[generate-favicon] brand pink: #F7A8B8");
console.info("[generate-favicon] wrote", iconPath);
console.info("[generate-favicon] wrote src/app/favicon.ico");
