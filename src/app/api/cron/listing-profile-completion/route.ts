import { processListingProfileCompletion } from "@/lib/listing-profile-completion/process";
import { createCronHandlers } from "@/lib/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET+POST /api/cron/listing-profile-completion
 *
 * Isolated listing-profile campaign (listing_profile_completion_v1).
 * Never resumes marketing campaigns or Day 5/Day 10 onboarding reminders.
 * Not registered in vercel.json — invoke only with CRON_SECRET when enabled.
 *
 * Sending stays off until LISTING_PROFILE_COMPLETION_ENABLED=true and
 * LISTING_PROFILE_COMPLETION_DRY_RUN=false. Historical backlog stays off
 * until LISTING_PROFILE_COMPLETION_HISTORICAL_ROLLOUT=true.
 */
async function run(_request: Request) {
  const result = await processListingProfileCompletion();
  return Response.json({
    ...result,
    preview: result.preview.map((row) => ({
      ...row,
      email: "[redacted]",
      firstName: null,
    })),
  });
}

export const { GET, POST } = createCronHandlers(run, { allowEmailInternalHeader: true });
