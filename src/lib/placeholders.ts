/** Deterministic gradient pick from a string seed — stable “random” placeholders per entity. */
const PLACEHOLDER_GRADIENTS = [
  "from-mint/75 via-lavender/55 to-pastel-blue/65",
  "from-pastel-blue/70 via-mint/60 to-lavender/50",
  "from-lavender/65 via-pastel-blue/55 to-mint/60",
  "from-mint/70 via-pastel-blue/50 to-orange/35",
  "from-pastel-blue/65 via-lavender/60 to-mint/55",
  "from-lavender/70 via-mint/55 to-pastel-blue/60",
] as const;

export function placeholderGradient(seed: string): (typeof PLACEHOLDER_GRADIENTS)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length];
}
