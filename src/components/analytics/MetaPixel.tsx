"use client";

import {
  getMetaPixelId,
  isMetaPixelEnabled,
  META_PIXEL_SCRIPT_ID,
  pageView,
} from "@/lib/meta-pixel";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function MetaPixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    pageView();
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel() {
  const pixelId = getMetaPixelId();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isMetaPixelEnabled());
  }, []);

  if (process.env.NODE_ENV !== "production" || !pixelId || !enabled) {
    return null;
  }

  return (
    <>
      <Script
        id={META_PIXEL_SCRIPT_ID}
        strategy="afterInteractive"
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
        <MetaPixelPageView />
      </Suspense>
    </>
  );
}
