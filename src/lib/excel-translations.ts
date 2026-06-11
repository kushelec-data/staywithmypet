import type { Locale } from "@/i18n/translations";

/**
 * English → Estonian labels from translations.xlsx (Translations tab).
 * Source columns: Eng text, Est text (table rows inside Eng text cells).
 */
const EXCEL_EN_TO_ET: Record<string, string> = {
  "Back to search pets": "Tagasi lemmikute otsingusse",
  dog: "Koer",
  Friendly: "Sõbralik",
  Active: "Aktiivne",
  "Kid-friendly": "Lastesõbralik",
  "Dog-friendly": "Sõbralik teiste koertega",
  Available: "Saadaval",
  "9 years old": "9-aastane",
  Male: "Isane",
  "Send care request": "Saada hoiupäring",
  "Save pet": "Lisa lemmikute hulka",
  Share: "Jaga",
  "Exact address is hidden until booking is confirmed":
    "Turvalisuse huvides avaldatakse täpne aadress alles pärast hoiupäringu kinnitamist.",
  "Care needs": "Lemmiku vajadused",
  SERVICES: "Hoiuvõimalused",
  Services: "Hoiuvõimalused",
  Walks: "Jalutuskäigud",
  WALKS: "Jalutuskäigud",
  "Overnight Care / 24h Stay": "Ööpäevaringne hoid",
  "Overnight care / 24h stay": "Ööpäevaringne hoid",
  "2x per day": "2 korda päevas",
  MEDICATION: "Ravivajadused",
  Medication: "Ravivajadused",
  "Needs medication": "Vajab ravimeid",
  Reviews: "Arvustused",
  "No reviews yet.": "Arvustusi pole veel.",
  "View bookings": "Vaata hoiupäringuid",
  Availability: "Saadavus",
  "Open just for walks and play time too.": "Avatud ka jalutuskäikudeks ja mänguajaks.",
  "Sometimes need overnight care.": "Vahel vajan ka ööpäevaringset hoidu.",
  "Pet parent": "Loomaomanik",
  "View profile": "Vaata profiili",
  "Emergency care nearby": "Lähedal asuvad loomakliinikud",
  "Veterinary clinics in this pet's area — verify hours before visiting.":
    "Selle lemmiku piirkonnas asuvad loomakliinikud. Enne külastust kontrolli palun lahtiolekuaegu.",
  Call: "Helista",
  Map: "Kaardil",
  "View all veterinary clinics": "Vaata kõiki loomakliinikuid",
  "Emergency care & full clinic list": "Erakorralise abi ja kliinikute täielik nimekiri",
  // Pet search filter options
  Dog: "Koer",
  Cat: "Kass",
  cat: "Kass",
  Rabbit: "Küülik",
  rabbit: "Küülik",
  Bird: "Lind",
  bird: "Lind",
  Rodent: "Näriline",
  rodent: "Näriline",
  Fish: "Kala",
  fish: "Kala",
  Reptile: "Roomaja",
  reptile: "Roomaja",
  Other: "Muu",
  other: "Muu",
  "Tiny / Under 5 kg": "Väike / alla 5 kg",
  "Small–Medium / 5–10 kg": "Väike–keskmine / 5–10 kg",
  "Medium–Large / 10–15 kg": "Keskmine–suur / 10–15 kg",
  "Large / Over 15 kg": "Suur / üle 15 kg",
  "Low (chill mode)": "Madal (rahulik režiim)",
  "Moderate (ready to play)": "Keskmine (mänguks valmis)",
  "High (zoomies all day)": "Kõrge (terve päev liikvel)",
  Low: "Madal",
  Medium: "Keskmine",
  High: "Kõrge",
  "Friendly with dogs": "Sõbralik teiste koertega",
  "Friendly with cats": "Sõbralik teiste kassidega",
  "Cat-friendly": "Sõbralik teiste kassidega",
  Shy: "Häbelik",
  Independent: "Iseseisev",
  Playful: "Mänguline",
  Calm: "Rahulik",
  Protective: "Kaitsev",
  "No medication needed": "Ravimeid pole vaja",
  None: "Puudub",
  "Short walks": "Lühikesed jalutuskäigud",
  "Long walks": "Pikad jalutuskäigud",
  "High activity": "Suur liikumisvajadus",
  "Outdoor play": "Välimäng",
  "At pet friend's home": "Lemmikusõbra kodus",
  "At pet parent's home": "Loomaomaniku kodus",
  "Flexible — either home works": "Paindlik — sobib mõlemal pool",
  "Walks only": "Ainult jalutuskäigud",
  Daycare: "Päevahoid",
  "Home visits": "Kodukülastused",
  "Feeding only": "Ainult toitmine",
  "Play visits": "Mängukülastused",
  English: "Inglise",
  Estonian: "Eesti",
  Russian: "Vene",
};

const EXCEL_KEYS_LOWER = new Map(
  Object.entries(EXCEL_EN_TO_ET).map(([en, et]) => [en.trim().toLowerCase(), et]),
);

/** Returns Estonian from Excel if present; otherwise `undefined` (no invented copy). */
export function getExcelLabelEt(text: string | null | undefined): string | undefined {
  if (!text?.trim()) return undefined;
  const trimmed = text.trim();
  const direct = EXCEL_EN_TO_ET[trimmed];
  if (direct) return direct;
  return EXCEL_KEYS_LOWER.get(trimmed.toLowerCase());
}

/** Translate a stored/display English label using the Excel map; falls back to English. */
export function translateExcelLabel(text: string | null | undefined, locale: Locale): string {
  if (!text?.trim()) return "";
  if (locale !== "et") return text.trim();

  const trimmed = text.trim();
  const direct = EXCEL_EN_TO_ET[trimmed];
  if (direct) return direct;

  const byLower = EXCEL_KEYS_LOWER.get(trimmed.toLowerCase());
  if (byLower) return byLower;

  const aboutMatch = /^About\s+(.+)$/i.exec(trimmed);
  if (aboutMatch) {
    return `${aboutMatch[1]!.trim()} tutvustus`;
  }

  const ageMatch = /^(\d+)\s*years?\s*old$/i.exec(trimmed);
  if (ageMatch) {
    return `${ageMatch[1]}-aastane`;
  }

  return trimmed;
}

export function translateExcelLabels(values: string[], locale: Locale): string[] {
  return values.map((v) => translateExcelLabel(v, locale)).filter(Boolean);
}
