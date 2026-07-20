/**
 * Full booking contact diagnostic — RPC, legacy path, profile columns.
 * Usage: node scripts/diagnose-booking-contact-full.mjs [booking-id]
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

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bookingIdArg = process.argv[2]?.trim();

  if (!url || !serviceKey) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("=== RPC existence ===");
  const rpcProbe = await fetch(`${url}/rest/v1/rpc/get_booking_participant_contact`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_booking_id: bookingIdArg ?? "00000000-0000-0000-0000-000000000000" }),
  });
  const rpcBody = await rpcProbe.text();
  console.log("HTTP", rpcProbe.status, rpcBody.slice(0, 400));

  console.log("\n=== booking_allows_contact_share probe ===");
  const allowProbe = await fetch(`${url}/rest/v1/rpc/booking_allows_contact_share`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_status: "active" }),
  });
  console.log("HTTP", allowProbe.status, (await allowProbe.text()).slice(0, 200));

  console.log("\n=== Active/upcoming bookings (service role) ===");
  const { data: bookings, error: bookingsErr } = await admin
    .from("bookings")
    .select("id, pet_id, pet_parent_id, pet_friend_id, status, start_date, end_date")
    .in("status", ["upcoming", "active", "completed"])
    .order("created_at", { ascending: false })
    .limit(5);

  if (bookingsErr) {
    console.error("bookings query error:", bookingsErr.code, bookingsErr.message);
    process.exit(1);
  }

  console.log(JSON.stringify(bookings, null, 2));

  const bookingId = bookingIdArg ?? bookings?.[0]?.id;
  if (!bookingId) {
    console.log("No booking to test.");
    process.exit(0);
  }

  const booking = bookings?.find((b) => b.id === bookingId) ?? bookings?.[0];
  console.log("\n=== Testing booking", bookingId, "===");
  console.log("status:", booking?.status);
  console.log("pet_parent_id:", booking?.pet_parent_id);
  console.log("pet_friend_id:", booking?.pet_friend_id);

  const profileSelect =
    "id, display_name, avatar_url, phone, phone_e164, phone_number, phone_country_code, formatted_address, address, latitude, longitude, emergency_contact_name, emergency_contact_phone_e164, emergency_contact_phone_number, emergency_contact_phone_country_code, details";

  for (const label of ["pet_parent", "pet_friend"]) {
    const pid = label === "pet_parent" ? booking?.pet_parent_id : booking?.pet_friend_id;
    console.log(`\n--- Profile (${label}) ${pid} ---`);
    const { data, error } = await admin.from("profiles").select(profileSelect).eq("id", pid).maybeSingle();
    if (error) {
      console.log("ERROR:", error.code, error.message, error.details, error.hint);
    } else {
      console.log("OK:", JSON.stringify(data, null, 2));
    }
  }

  console.log("\n--- Preferred vet columns (pet parent) ---");
  const vetSelect =
    "preferred_vet_clinic_name, share_preferred_vet_during_booking";
  const { data: vetData, error: vetErr } = await admin
    .from("profiles")
    .select(vetSelect)
    .eq("id", booking?.pet_parent_id)
    .maybeSingle();
  if (vetErr) {
    console.log("VET COLUMNS ERROR:", vetErr.code, vetErr.message, vetErr.details);
  } else {
    console.log("VET OK:", JSON.stringify(vetData));
  }

  console.log("\n--- Pet row ---");
  const { data: petData, error: petErr } = await admin
    .from("pets")
    .select("id, name, requires_medication, feeding_schedule, additional_notes")
    .eq("id", booking?.pet_id)
    .maybeSingle();
  if (petErr) console.log("PET ERROR:", petErr.code, petErr.message);
  else console.log("PET OK:", JSON.stringify(petData));

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
