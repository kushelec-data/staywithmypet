import { processProfileCompletionReminders } from "@/lib/profile-completion-reminders/process";
import { createCronHandlers } from "@/lib/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET+POST /api/cron/profile-completion-reminders
 *
 * Isolated from marketing campaigns. Must never resume or process campaign queues.
 * Daily 09:15 UTC — valid on Hobby (once/day) and Pro. Existing 09:00 transactional
 * crons stay unchanged.
 *
 * Sending stays off until PROFILE_COMPLETION_REMINDER_ENABLED=true and
 * PROFILE_COMPLETION_REMINDER_DRY_RUN=false. Day 10 stays off until
 * PROFILE_COMPLETION_REMINDER_DAY10_APPROVED=true. While
 * PROFILE_COMPLETION_REMINDER_PILOT_ONLY=true, only env allowlist IDs that
 * also appear in PROFILE_REMINDER_PILOT_USER_IDS can be sent.
 */
async function run(_request: Request) {
  const result = await processProfileCompletionReminders();
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
