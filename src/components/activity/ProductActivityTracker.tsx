"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readCookieConsent } from "@/lib/cookie-consent";
import { pageViewDedupeKey, shouldRecordPageView } from "@/lib/activity/track";

function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem("swmp_activity_session");
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem("swmp_activity_session", created);
    return created;
  } catch {
    return "anon";
  }
}

export function ProductActivityTracker() {
  const pathname = usePathname();
  const { user } = useAuth();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !pathname) return;
    if (lastPath.current === pathname) return;
    const sid = sessionId();
    const key = pageViewDedupeKey(pathname, sid);
    let already = false;
    try {
      already = window.sessionStorage.getItem(key) === "1";
    } catch {
      already = false;
    }
    const consent = readCookieConsent();
    if (
      !shouldRecordPageView({
        pathname,
        analyticsConsent: Boolean(consent?.analytics),
        alreadyRecorded: already,
      })
    ) {
      lastPath.current = pathname;
      return;
    }
    lastPath.current = pathname;
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    void fetch("/api/activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "page_view",
        pagePath: pathname,
        sessionId: sid,
      }),
    }).catch(() => undefined);
  }, [pathname, user?.id]);

  return null;
}
