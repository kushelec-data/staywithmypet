"use client";

import {
  COOKIE_CONSENT_CHANGE_EVENT,
  readCookieConsent,
} from "@/lib/cookie-consent";
import {
  getMetaPixelId,
  isMetaPixelProductionRuntime,
  META_PIXEL_SCRIPT_ID,
  pageView,
} from "@/lib/meta-pixel";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function MetaPixelPageView({ pixelReady }: { pixelReady: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pixelReady) return;
    const key = `${pathname}?${searchParams.toString()}`;
    if (lastSentRef.current === key) return;
    lastSentRef.current = key;
    pageView();
  }, [pathname, searchParams, pixelReady]);

  return null;
}

/**
 * Loads Meta Pixel only after marketing consent. Mirrors ConsentAwareAnalytics.
 * Script and fbq are not injected until consent?.marketing === true.
 */
export function ConsentAwareMetaPixel() {
  const pixelId = getMetaPixelId();
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const [runtimeEnabled, setRuntimeEnabled] = useState(false);
  const [pixelReady, setPixelReady] = useState(false);

  useEffect(() => {
    setRuntimeEnabled(isMetaPixelProductionRuntime());

    const sync = () => {
      const consent = readCookieConsent();
      setMarketingEnabled(consent?.marketing === true);
      if (consent?.marketing !== true) {
        setPixelReady(false);
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

  const shouldLoad = runtimeEnabled && marketingEnabled && Boolean(pixelId);

  if (!shouldLoad) return null;

  return (
    <>
      <Script
        id={META_PIXEL_SCRIPT_ID}
        strategy="afterInteractive"
        onReady={() => setPixelReady(true)}
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
`,
        }}
      />
      <Suspense fallback={null}>
        <MetaPixelPageView pixelReady={pixelReady} />
      </Suspense>
    </>
  );
}
