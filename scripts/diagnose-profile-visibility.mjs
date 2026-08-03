/**
 * Profile visibility diagnostic for Find Care / public profile pages.
 * Usage: node scripts/diagnose-profile-visibility.mjs [name-fragment]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const env = { ...process.env };
  if (!fs.existsSync(envPath)) return env;
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

function profileCalendarSelectedDates(details) {
  if (!details || typeof details !== "object") return [];
  const avail = details.availability;
  if (!avail || typeof avail !== "object") return [];
  const dates = avail.selected_dates;
  return Array.isArray(dates) ? dates.filter((d) => typeof d === "string" && d.trim()) : [];
}

function resolvedPetCarePreferences(details) {
  if (!details || typeof details !== "object") return {};
  const care = details.pet_care_preferences;
  return care && typeof care === "object" ? care : {};
}

function resolvedLivingSituation(details) {
  if (!details || typeof details !== "object") return {};
  const living = details.living_situation;
  return living && typeof living === "object" ? living : {};
}

function hasAnyCarePreferenceToggle(care) {
  return (
    care.willing_special_medical_needs === true ||
    care.willing_behavioral_quirks === true ||
    care.willing_seniors === true ||
    care.willing_puppies_kittens === true
  );
}

function hasSavedProfileLocation(profile) {
  const publicLoc = profile.public_location?.trim();
  if (publicLoc) return true;
  const city = profile.city?.trim();
  const country = profile.country?.trim();
  if (city && country && profile.google_place_id) return true;
  const legacy = profile.location?.trim();
  if (!legacy) return false;
  if (profile.google_place_id || (profile.latitude != null && profile.longitude != null)) {
    return true;
  }
  return Boolean(legacy);
}

function friendDetailsChecks(details) {
  const care = resolvedPetCarePreferences(details);
  const dates = profileCalendarSelectedDates(details);
  return {
    experience: Boolean(care.experience_level?.trim()),
    petTypes: (care.pet_types_willing_to_care_for?.length ?? 0) > 0,
    petSizes: (care.preferred_pet_sizes?.length ?? 0) > 0,
    careServices: (care.available_care_types?.length ?? 0) > 0,
    availability: dates.length > 0,
    serviceArea: Boolean(care.preferred_care_location?.trim()),
    careToggles: hasAnyCarePreferenceToggle(care),
  };
}

function isDiscoverableOnFindCare(profile) {
  return profile.role === "pet_friend" || profile.role === "both";
}

function isPetFriendFindCareListingEligible(profile) {
  if (profile.is_public === false) return { ok: false, reason: "is_public=false" };
  if (!isDiscoverableOnFindCare(profile)) return { ok: false, reason: `role=${profile.role}` };
  if (!profile.display_name?.trim()) return { ok: false, reason: "missing display_name" };
  if (!hasSavedProfileLocation(profile)) return { ok: false, reason: "missing location" };

  const details = profile.details ?? {};
  const friendChecks = friendDetailsChecks(details);
  const living = resolvedLivingSituation(details);
  const hasLivingSituation = Boolean(living.living_type?.trim());

  const failed = Object.entries(friendChecks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (!hasLivingSituation) failed.push("living_type");

  return failed.length === 0
    ? { ok: true, friendChecks, hasLivingSituation }
    : { ok: false, reason: "listing fields", failed, friendChecks, hasLivingSituation };
}

function isPetFriendMarketplaceMinimumEligible(profile) {
  if (profile.is_public === false) return false;
  if (!isDiscoverableOnFindCare(profile)) return false;
  if (!profile.display_name?.trim()) return false;
  if (!profile.bio?.trim()) return false;
  return hasSavedProfileLocation(profile);
}

function summarizeProfile(p) {
  const listing = isPetFriendFindCareListingEligible(p);
  return {
    id: p.id,
    display_name: p.display_name,
    role: p.role,
    active_mode: p.active_mode,
    is_public: p.is_public,
    has_bio: Boolean(p.bio?.trim()),
    has_location: hasSavedProfileLocation(p),
    role_chosen_at: p.role_chosen_at,
    membership_status: p.membership_status,
    marketplace_minimum: isPetFriendMarketplaceMinimumEligible(p),
    find_care_listing: listing,
    details_keys: p.details && typeof p.details === "object" ? Object.keys(p.details) : [],
  };
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const fragment = (process.argv[2] ?? "triin").trim().toLowerCase();

  if (!url || !serviceKey || !anonKey) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id, display_name, role, active_mode, is_public, bio, location, public_location, city, country, google_place_id, latitude, longitude, role_chosen_at, created_at, updated_at, details, membership_status",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("profiles error", error);
    process.exit(1);
  }

  const matches = (profiles ?? []).filter((p) => {
    const dn = (p.display_name ?? "").toLowerCase();
    return dn.includes(fragment) || fragment.split(/\s+/).some((part) => dn.includes(part));
  });

  console.log(`=== PROFILES matching "${fragment}" (${matches.length}) ===`);
  for (const p of matches) {
    const { data: fullRow } = await admin.from("profiles").select("*").eq("id", p.id).single();
    console.log("  full_row:", JSON.stringify(fullRow, null, 2));
    console.log(JSON.stringify(summarizeProfile(p), null, 2));

    const { data: pets } = await admin
      .from("pets")
      .select("id, name, species, is_public, is_active, owner_id")
      .eq("owner_id", p.id);
    console.log("  pets:", pets ?? []);

    const { data: mems } = await admin
      .from("user_memberships")
      .select("id, role, status, start_date, end_date, plan_type")
      .eq("user_id", p.id);
    console.log("  memberships:", mems ?? []);

    const { data: searchHit } = await anon
      .from("profiles")
      .select("id, display_name, is_public, role")
      .eq("is_public", true)
      .eq("id", p.id)
      .maybeSingle();
    console.log("  anon search query (is_public=true):", searchHit ? "FOUND" : "NOT FOUND");

    const { data: anonDirect } = await anon
      .from("profiles")
      .select("id, display_name, is_public, role")
      .eq("id", p.id)
      .maybeSingle();
    console.log("  anon direct by id:", anonDirect ?? "BLOCKED/MISSING");
  }

  // Also try common affected names explicitly
  const explicitNames = ["triin hook", "umut vedat"];
  for (const name of explicitNames) {
    const hit = (profiles ?? []).find((p) => (p.display_name ?? "").toLowerCase() === name);
    if (hit && !matches.some((m) => m.id === hit.id)) {
      console.log(`=== EXPLICIT MATCH: ${name} ===`);
      console.log(JSON.stringify(summarizeProfile(hit), null, 2));
    }
  }

  // Working comparison: public pet friends passing listing gate
  const publicFriends = (profiles ?? []).filter(
    (p) => p.is_public === true && (p.role === "pet_friend" || p.role === "both"),
  );
  const listable = publicFriends.filter((p) => isPetFriendFindCareListingEligible(p).ok);
  console.log(`=== WORKING COMPARISON (${listable.length} listable / ${publicFriends.length} public friends) ===`);
  if (listable[0]) {
    console.log(JSON.stringify(summarizeProfile(listable[0]), null, 2));
  }

  // Auth users without profile row (service role listUsers)
  const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) {
    console.warn("auth listUsers error", authErr.message);
  } else {
    const authMatches = (authData?.users ?? []).filter((u) => {
      const meta = JSON.stringify(u.user_metadata ?? {}).toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      return (
        explicitNames.some((n) => meta.includes(n.replace(" ", "")) || email.includes(n.split(" ")[0])) ||
        (u.email ?? "").toLowerCase().includes(fragment)
      );
    });
    for (const u of authMatches) {
      const hasProfile = (profiles ?? []).some((p) => p.id === u.id);
      console.log("=== AUTH USER ===", {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        email_confirmed: Boolean(u.email_confirmed_at),
        has_profile_row: hasProfile,
      });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
