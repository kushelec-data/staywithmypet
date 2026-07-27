/** Result of clicking Send care request / Send request before opening UI. */
export type SendRequestOpenAction =
  | "noop_blocked"
  | "redirect_login"
  | "open_upgrade_modal"
  | "open_request_form";

/**
 * Decides what happens when the user explicitly clicks send request.
 * Automatic upsell dismiss state must not affect this path.
 */
export function resolveSendRequestOpenAction(input: {
  blocked: boolean;
  userLoggedIn: boolean;
  needsUpgrade: boolean;
}): SendRequestOpenAction {
  if (input.blocked) return "noop_blocked";
  if (!input.userLoggedIn) return "redirect_login";
  if (input.needsUpgrade) return "open_upgrade_modal";
  return "open_request_form";
}

/** Care requests must never reach the server without active sender membership. */
export function shouldSubmitCareRequest(needsUpgrade: boolean): boolean {
  return !needsUpgrade;
}
