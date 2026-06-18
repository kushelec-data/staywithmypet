# Animation assets

## Dog story CTA (signup, membership, homepage)

Conversion section with a lightweight CSS/SVG story loop and optional MP4.

| File | Purpose |
|------|---------|
| `dog-story.mp4` | Optional loop — lazy-loaded when in view; replaces CSS scene on success |
| `boston-terrier-run-poster.webp` | Static fallback if the video fails to load |
| `puppy-welcome-fallback.webp` | Legacy mascot still image |

Used by `src/components/marketing/DogStoryCTA.tsx`.

Drop a short, muted-friendly MP4 at `dog-story.mp4` (keep under ~500 KB for mobile).

## Puppy assistant (homepage & pricing)

Small bottom-right assistant for logged-out visitors on `md+` breakpoints.

| File | Purpose |
|------|---------|
| `puppy-welcome-fallback.webp` | Static puppy image (max 140px height in UI) |

Used by `src/components/marketing/PetMascotCTA.tsx`.

Optional future asset:

| File | Purpose |
|------|---------|
| `puppy-welcome.webm` | Short transparent loop — wire up only if you want motion beyond the subtle CSS float |

Replace `puppy-welcome-fallback.webp` with a frame exported from your final clip for a consistent look.
