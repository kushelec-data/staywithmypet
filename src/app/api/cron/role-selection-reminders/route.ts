import { processRoleSelectionReminders } from "@/lib/role-selection-reminders/process";
import { createCronHandlers } from "@/lib/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET+POST /api/cron/role-selection-reminders
 *
 * Isolated role-selection campaign (role_selection_reminder_v1).
 * Never resumes marketing campaigns, Day 5/Day 10 onboarding, or listing reminders.
 * Reminder 2 sends only when STAGE2_APPROVED is explicit and stage-1
 * sent_at is at least 5 × 24 hours old. There is no Reminder 3.
 *
 * Sending stays off until ROLE_SELECTION_REMINDER_ENABLED=true and
 * ROLE_SELECTION_REMINDER_DRY_RUN=false. Historical Reminder 1 backlog stays
 * off until ROLE_SELECTION_REMINDER_HISTORICAL_ROLLOUT=true. Stage 2 for
 * users who already received Reminder 1 is not gated by historical rollout.
 */
async function run(_request: Request) {
  const result = await processRoleSelectionReminders();
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
