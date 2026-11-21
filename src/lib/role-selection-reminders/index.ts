export {
  ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
  ROLE_SELECTION_REMINDER_FROM,
  ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX,
  ROLE_SELECTION_CTA_PATH,
  DEFAULT_ROLE_SELECTION_EXCLUSIONS,
  roleSelectionUniqueKey,
  readRoleSelectionCampaignConfig,
} from "./config";
export { decideRoleSelectionAction, roleSelectionCohort } from "./eligibility";
export { processRoleSelectionReminders } from "./process";
export {
  buildRoleSelectionReminder1Email,
  markRoleSelectionInternalTestEmail,
  roleSelectionCtaUrl,
} from "./templates";
export { ROLE_SELECTION_REMINDER_1_COPY } from "./copy";
