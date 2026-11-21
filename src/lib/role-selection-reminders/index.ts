export {
  ROLE_SELECTION_REMINDER_CAMPAIGN_ID,
  ROLE_SELECTION_REMINDER_FROM,
  ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX,
  ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX_STAGE2,
  ROLE_SELECTION_CTA_PATH,
  ROLE_SELECTION_STAGE2_DELAY_MS,
  DEFAULT_ROLE_SELECTION_EXCLUSIONS,
  roleSelectionUniqueKey,
  roleSelectionStage2DueAt,
  isRoleSelectionStage2Due,
  readRoleSelectionCampaignConfig,
} from "./config";
export {
  decideRoleSelectionAction,
  deriveRoleSelectionLifecycle,
  roleSelectionCohort,
} from "./eligibility";
export { processRoleSelectionReminders } from "./process";
export {
  buildRoleSelectionReminder1Email,
  buildRoleSelectionReminder2Email,
  buildRoleSelectionReminderEmail,
  markRoleSelectionInternalTestEmail,
  roleSelectionCtaUrl,
} from "./templates";
export { ROLE_SELECTION_REMINDER_1_COPY, ROLE_SELECTION_REMINDER_2_COPY } from "./copy";
