import "server-only";

import { sendCampaignNextBatch } from "@/lib/email-campaigns/send";
import { claimDueScheduledCampaigns, claimExpiredSendingCampaigns } from "@/lib/email-campaigns/store-bulk";

const MAX_BATCHES_PER_RUN = 8;

export async function processDueScheduledCampaigns(): Promise<{
  claimed: number;
  continued: number;
  finished: number;
  skipped: number;
}> {
  const due = await claimDueScheduledCampaigns();
  const resumed = await claimExpiredSendingCampaigns();
  const jobs = [
    ...due.map((row) => ({ ...row, kind: "due" as const })),
    ...resumed.filter((row) => !due.some((item) => item.id === row.id)).map((row) => ({ ...row, kind: "resume" as const })),
  ];
  let finished = 0;
  let skipped = 0;
  for (const job of jobs) {
    let continueExisting = true;
    let done = false;
    for (let i = 0; i < MAX_BATCHES_PER_RUN; i += 1) {
      const result = await sendCampaignNextBatch({
        campaignId: job.id,
        mode: "pending",
        confirm: true,
        continueExisting,
        leaseId: job.leaseId,
        sendLanguageMode: "automatic",
      });
      if (!result.ok) {
        skipped += 1;
        break;
      }
      if (result.done) {
        finished += 1;
        done = true;
        break;
      }
      continueExisting = true;
    }
    void done;
  }
  return {
    claimed: due.length,
    continued: resumed.length,
    finished,
    skipped,
  };
}
