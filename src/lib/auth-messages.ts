type AuthMessageKey =
  | "errorGeneric"
  | "invalidCredentials"
  | "emailAlreadyRegistered"
  | "emailNotConfirmed"
  | "weakPassword"
  | "oauthFailed"
  | "profileCreateFailed";

type AuthMessages = Record<AuthMessageKey, string>;

export function isEmailNotConfirmedError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.toLowerCase().includes("email not confirmed")
  );
}

export function formatAuthError(error: unknown, messages: AuthMessages): string {
  if (!(error instanceof Error)) {
    return messages.errorGeneric;
  }

  const msg = error.message.toLowerCase();

  if (msg.includes("email not confirmed")) {
    return messages.emailNotConfirmed;
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
    return messages.invalidCredentials;
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return messages.emailAlreadyRegistered;
  }
  if (msg.includes("password") && (msg.includes("weak") || msg.includes("at least"))) {
    return messages.weakPassword;
  }
  if (msg.includes("profile")) {
    return messages.profileCreateFailed;
  }

  return error.message || messages.errorGeneric;
}
