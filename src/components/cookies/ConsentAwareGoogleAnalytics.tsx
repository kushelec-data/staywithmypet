"use client";

import {
  COOKIE_CONSENT_CHANGE_EVENT,
  readCookieConsent,
} from "@/lib/cookie-consent";
import {
  GA_MEASUREMENT_INIT_SCRIPT_ID,
  getGaMeasurementId,
  isGoogleAnalyticsProductionRuntime,
  pageView,
} from "@/lib/google-analytics";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function GoogleAnalyticsPageView({ gaReady }: { gaReady: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gaReady) return;
    if (readCookieConsent()?.analytics !== true) return;

    const pagePath = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    if (lastSentRef.current === pagePath) return;
    lastSentRef.current = pagePath;
    pageView(pagePath);
  }, [pathname, searchParams, gaReady]);

  return null;
}

/**
 * Loads GA4 only after analytics consent. Script and gtag are not injected until
 * consent?.analytics === true.
 */
export function ConsentAwareGoogleAnalytics() {
  const measurementId = getGaMeasurementId();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [runtimeEnabled, setRuntimeEnabled] = useState(false);
  const [gaReady, setGaReady] = useState(false);

  useEffect(() => {
    setRuntimeEnabled(isGoogleAnalyticsProductionRuntime());

    const sync = () => {
      const consent = readCookieConsent();
      setAnalyticsEnabled(consent?.analytics === true);
      if (consent?.analytics !== true) {
        setGaReady(false);
      }
    };

    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const shouldLoad = runtimeEnabled && analyticsEnabled && Boolean(measurementId);

  if (!shouldLoad) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id={GA_MEASUREMENT_INIT_SCRIPT_ID}
        strategy="afterInteractive"
        onReady={() => setGaReady(true)}
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
window.gtag = function(){window.dataLayer.push(arguments);};
gtag('js', new Date());
gtag('config', '${measurementId}', { send_page_view: false });
`,
        }}
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsPageView gaReady={gaReady} />
      </Suspense>
    </>
  );
}
