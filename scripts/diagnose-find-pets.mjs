/**
 * Find Pets marketplace diagnostic — probes each PUBLIC_PET_SELECT tier.
 * Usage: node scripts/diagnose-find-pets.mjs [pet-name-fragment]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const PUBLIC_PET_PHOTO_SELECT =
  "pet_photos ( public_url, is_primary, sort_order, object_position_x, object_position_y, photo_scale )";
const PUBLIC_PET_PHOTO_SELECT_LEGACY = "pet_photos ( public_url, is_primary, sort_order )";

const PUBLIC_PET_SELECT =
  "id, name, species, breed, other_breed, age_label, date_of_birth, size_label, location, latitude, longitude, temperament, energy_level, requires_medication, feeding_schedule, eating_habits, walk_needs, health_characteristics, positive_traits, challenging_traits, additional_notes, friend_requirements, care_type, care_location, availability, availability_dates, is_active, is_public, price_per_night_cents, rating_avg, rating_count, owner_id, details, " +
  `${PUBLIC_PET_PHOTO_SELECT}, profiles!pets_owner_id_fkey ( id, display_name, avatar_url, is_public, role, languages, location, latitude, longitude, details, rating_avg, rating_count )`;

const PUBLIC_PET_SELECT_WITHOUT_OTHER = PUBLIC_PET_SELECT.replace("other_breed, ", "");
const PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC = PUBLIC_PET_SELECT.replace("is_public, ", "");
const PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC_NO_OTHER = PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC.replace(
  "other_breed, ",
  "",
);

function withLegacyPetPhotos(select) {
  return select.replace(PUBLIC_PET_PHOTO_SELECT, PUBLIC_PET_PHOTO_SELECT_LEGACY);
}

const PUBLIC_PET_SELECT_LEGACY = withLegacyPetPhotos(PUBLIC_PET_SELECT_WITHOUT_OTHER);
const PUBLIC_PET_SELECT_LEGACY_WITHOUT_IS_PUBLIC = withLegacyPetPhotos(
  PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC_NO_OTHER,
);

const TIERS = [
  ["PUBLIC_PET_SELECT", PUBLIC_PET_SELECT],
  ["PUBLIC_PET_SELECT_WITHOUT_OTHER", PUBLIC_PET_SELECT_WITHOUT_OTHER],
  ["PUBLIC_PET_SELECT_LEGACY (fixed)", PUBLIC_PET_SELECT_LEGACY],
  ["PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC", PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC],
  ["PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC_NO_OTHER", PUBLIC_PET_SELECT_WITHOUT_IS_PUBLIC_NO_OTHER],
  ["PUBLIC_PET_SELECT_LEGACY_WITHOUT_IS_PUBLIC (fixed)", PUBLIC_PET_SELECT_LEGACY_WITHOUT_IS_PUBLIC],
];

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const nameFilter = process.argv[2]?.trim()?.toLowerCase() ?? "luna";

  if (!url || !anonKey) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  console.log("=== other_breed column probe (service role) ===");
  if (serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const colProbe = await admin.from("pets").select("id, other_breed").limit(1);
    if (colProbe.error) {
      console.log("other_breed ERROR:", colProbe.error.code, colProbe.error.message);
    } else {
      console.log("other_breed column EXISTS");
    }
  } else {
    console.log("Skip column probe — no service role key");
  }

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n=== Tier probes (anon client — same as Find Pets page) ===");
  for (const [label, select] of TIERS) {
    const includesIsPublic = /\bis_public\b/.test(select);
    let query = anon
      .from("pets")
      .select(select)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);
    if (includesIsPublic) query = query.eq("is_public", true);

    const { data, error } = await query;
    if (error) {
      console.log(`\n[${label}] FAILED`);
      console.log("  code:", error.code);
      console.log("  message:", error.message);
      console.log("  details:", error.details);
      console.log("  hint:", error.hint);
    } else {
      const names = (data ?? []).map((r) => r.name).filter(Boolean);
      console.log(`\n[${label}] OK — ${data?.length ?? 0} rows`, names.slice(0, 5));
      const luna = (data ?? []).find((r) =>
        String(r.name ?? "")
          .toLowerCase()
          .includes(nameFilter),
      );
      if (luna) {
        console.log("  Luna match:", {
          id: luna.id,
          name: luna.name,
          breed: luna.breed,
          other_breed: luna.other_breed,
          is_public: luna.is_public,
          owner: luna.profiles?.display_name,
        });
      }
    }
  }

  console.log("\n=== Luna direct lookup (service role) ===");
  if (serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: lunaRows, error: lunaErr } = await admin
      .from("pets")
      .select("id, name, species, breed, other_breed, is_active, is_public, owner_id")
      .ilike("name", `%${nameFilter}%`)
      .limit(5);
    if (lunaErr) {
      console.log("Luna lookup ERROR:", lunaErr.code, lunaErr.message);
    } else {
      console.log(JSON.stringify(lunaRows, null, 2));
    }
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
