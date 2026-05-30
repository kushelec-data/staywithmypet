# Animation assets

## Puppy welcome (homepage hero)

Replace the placeholder files below with a **realistic** transparent puppy clip (3D/Blender-style or filmed motion with alpha — not flat cartoon SVG).

| File | Purpose |
|------|---------|
| `puppy-welcome.webm` | One-shot enter/pose clip: transparent VP9/WebM |
| `puppy-welcome-fallback.webp` | Static frame when video is missing or `prefers-reduced-motion: reduce` |

Used by `src/components/home/PuppyWelcome.tsx` on the homepage hero only.

Until `puppy-welcome.webm` is added, the site shows `puppy-welcome-fallback.webp` after the video element errors or when motion is reduced.

---

## Boston Terrier run animation

Replace the placeholder files below with a **realistic** transparent running-dog clip (3D/Blender-style or filmed motion with alpha — not flat cartoon SVG).

## Required files

| File | Purpose |
|------|---------|
| `boston-terrier-run.webm` | Primary loop: transparent VP9/WebM, side view, left → right gait |
| `boston-terrier-run-poster.webp` | Static frame when video is missing or `prefers-reduced-motion: reduce` |

## Optional

| File | Purpose |
|------|---------|
| `boston-terrier-run.apng` | Fallback for browsers without WebM alpha (wire up in `PetMascotCTA` if added) |

## Asset specs

- **Subject:** Boston Terrier or similar small dog — black/white, upright ears, compact build, natural running gait
- **Background:** Fully transparent (alpha channel)
- **Duration:** ~2–4 seconds, seamless loop
- **Width:** Max ~480px (height proportional, keep file small)
- **Codec:** WebM (VP9 + alpha) preferred; export from Blender, After Effects, or convert from ProRes 4444 / PNG sequence
- **Style:** Realistic / photographic / 3D — **not** illustrated cartoon

## FFmpeg example (after you have a PNG sequence or MOV with alpha)

```bash
ffmpeg -i frames/%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 28 boston-terrier-run.webm
```

## Poster fallback (current repo)

Until `boston-terrier-run.webm` is added, the site shows `boston-terrier-run-poster.webp` only when motion is reduced, or as the `<video poster>` while the clip loads.

**Poster image source (royalty-free):**

- Photo: [Black and white dog on green grass](https://unsplash.com/photos/black-and-white-short-coated-dog-on-green-grass-field-during-daytime-1605568427561) by [Mark Olsen](https://unsplash.com/@markolsen) on [Unsplash](https://unsplash.com) — [Unsplash License](https://unsplash.com/license) (free for commercial use, no attribution required; credit appreciated).

Replace this poster with a frame exported from your final WebM for a consistent look.

## WebM placeholder

`boston-terrier-run.webm` is **not** committed yet. Drop your file at this path; `PetMascotCTA` already references `/animations/boston-terrier-run.webm`.
