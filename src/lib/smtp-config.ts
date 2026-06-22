import "server-only";

export const DEFAULT_TRANSACTIONAL_FROM = "StayWithMyPet <info@staywithmypet.ee>";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
};

/** SpaceMail SMTP settings shared by contact form and transactional mail. */
export function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim() || "mail.spacemail.com";
  const portRaw = process.env.SMTP_PORT?.trim() || "465";
  const port = Number.parseInt(portRaw, 10);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();

  if (!user || !password || !Number.isFinite(port)) {
    return null;
  }

  return { host, port, user, password };
}

export function transactionalEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_TRANSACTIONAL_FROM;
}

export function isTransactionalEmailConfigured(): boolean {
  return readSmtpConfig() !== null;
}
