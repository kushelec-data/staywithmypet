const PET_CARD_TAGLINES = [
  "Cutie pie with endless zoomies and a heart full of love! 🐾",
  "Needs hugs, warm baths, and maybe a snack or two 😄",
  "Professional napper and snore champion. Don't judge! 😴",
  "Tiny explorer with big main-character energy.",
  "Will trade cuddles for treats.",
  "Certified chaos gremlin with a soft side. Handle with love.",
  "Part-time philosopher, full-time treat negotiator.",
  "Runs on sunshine, belly rubs, and dramatic sighs.",
  "Secretly convinced every walk is a parade in their honor.",
  "Soft ears, loud purrs, zero personal space boundaries.",
  "Loyal sidekick ready for adventures or couch marathons.",
  "May spontaneously perform tricks for cheese.",
] as const;

function hashPetId(petId: string): number {
  let h = 0;
  for (let i = 0; i < petId.length; i += 1) {
    h = (h * 31 + petId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Stable playful one-liner per pet for listing cards. */
export function getPetCardTagline(petId: string): string {
  return PET_CARD_TAGLINES[hashPetId(petId) % PET_CARD_TAGLINES.length];
}
