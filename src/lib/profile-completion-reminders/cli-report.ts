import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildHistoricalEligibilityReport } from "./report";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const name = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[name]) process.env[name] = value;
    }
  } catch {
    // Report can still run if env is already present.
  }
}

loadEnvLocal();

async function main() {
  const report = await buildHistoricalEligibilityReport();
  const preview = report.eligibleIfHistoricalApproved;
  const byRoleLanguage = new Map<string, number>();
  for (const row of preview) {
    const key = `${row.role}/${row.locale}`;
    byRoleLanguage.set(key, (byRoleLanguage.get(key) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        totalUsers: report.totalUsers,
        completedProfiles: report.completedProfiles,
        incompleteProfiles: report.incompleteProfiles,
        petParentIncomplete: report.petParentIncomplete,
        petFriendIncomplete: report.petFriendIncomplete,
        registered5to9Days: report.registered5to9Days,
        registered10to19Days: report.registered10to19Days,
        registered20to39Days: report.registered20to39Days,
        registered40to59Days: report.registered40to59Days,
        registered60PlusDays: report.registered60PlusDays,
        incomplete60PlusDays: report.incomplete60PlusDays,
        countsByLanguageAndRole: report.countsByLanguageAndRole,
        unknownRole: report.unknownRole,
        suppressedIneligible: report.suppressedIneligible,
        excludedInternalAddresses: report.excludedInternalAddresses,
        alreadyReminded: report.alreadyReminded,
        eligibleIfHistoricalApproved: preview.length,
        eligibleParentEn: report.eligibleParentEn,
        eligibleParentEt: report.eligibleParentEt,
        eligibleFriendEn: report.eligibleFriendEn,
        eligibleFriendEt: report.eligibleFriendEt,
        eligibleByRoleLanguage: Object.fromEntries(byRoleLanguage),
        eligibleOrganicNow: report.eligibleOrganicNow.length,
        unknownRoleUsers: report.unknownRoleUsers,
        recipientPreview: preview.map((row) => ({
          userId: row.userId,
          email: row.email,
          role: row.role,
          locale: row.locale,
          daysSinceRegistration: row.daysSinceRegistration,
          cohort: row.cohort,
        })),
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
