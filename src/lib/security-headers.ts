/**
 * Security response headers and CSP Report-Only directives.
 * Domains are derived from code/config references only — no guessed wildcards.
 */

export type SecurityHeader = {
  key: string;
  value: string;
};

function trimEnv(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Supabase REST, auth, storage, and realtime origins from NEXT_PUBLIC_SUPABASE_URL. */
export function supabaseCspOrigins(): string[] {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) return [];
  try {
    const host = new URL(url).host;
    return [`https://${host}`, `wss://${host}`];
  } catch {
    return [];
  }
}

/**
 * Report-Only CSP. GA4 and Meta Pixel bootstrap via inline Script tags
 * (ConsentAwareGoogleAnalytics / ConsentAwareMetaPixel); nonce middleware is
 * not wired yet, so script-src includes 'unsafe-inline' for those bootstraps.
 * style-src includes 'unsafe-inline' for Next.js and Leaflet runtime styles.
 */
export function buildContentSecurityPolicyReportOnly(): string {
  const supabase = supabaseCspOrigins();

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
    "https://maps.googleapis.com",
    "https://va.vercel-scripts.com",
  ];

  const connectSrc = [
    "'self'",
    ...supabase,
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://analytics.google.com",
    "https://www.facebook.com",
    "https://graph.facebook.com",
    "https://maps.googleapis.com",
    "https://vitals.vercel-insights.com",
    "https://va.vercel-scripts.com",
  ];

  const supabaseHttps = supabase.filter((origin) => origin.startsWith("https://"));

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...supabaseHttps,
    "https://lh3.googleusercontent.com",
    "https://*.googleusercontent.com",
    "https://maps.gstatic.com",
    "https://*.tile.openstreetmap.org",
    "https://www.facebook.com",
  ];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
    "object-src": ["'none'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": imgSrc,
    "font-src": ["'self'"],
    "connect-src": connectSrc,
    "frame-src": ["'self'", "https://www.openstreetmap.org"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function buildPermissionsPolicy(): string {
  return [
    "accelerometer=()",
    "camera=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "payment=()",
    "usb=()",
    "interest-cohort=()",
  ].join(", ");
}

export function buildSecurityHeaders(): SecurityHeader[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    { key: "Permissions-Policy", value: buildPermissionsPolicy() },
    {
      key: "Content-Security-Policy-Report-Only",
      value: buildContentSecurityPolicyReportOnly(),
    },
  ];
}
