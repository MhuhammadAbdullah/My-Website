import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";
import type { IntegrationsSettings } from "./types";

// Renders sitewide tracking/marketing scripts, each strictly conditional on
// its own ID being configured in the admin panel -- no hardcoded IDs, no
// integration loads with an empty field. Every `next/script` tag below has a
// stable `id`, which is how Next dedupes script injection itself (a second
// <Script> with the same id is a no-op) -- combined with this component only
// ever being rendered once from the root layout, that's what keeps GTM/GA4
// from ever double-initializing.
export function TrackingScripts({ integrations }: { integrations: IntegrationsSettings | undefined }) {
  if (!integrations) return null;

  const { gtmId, ga4Id, googleAdsId, googleAdsConversionLabel, metaPixelId, clarityId } = integrations;

  // GA4 and Google Ads both run on the same gtag.js runtime -- load the
  // library once (whichever ID is present) and issue a separate `config`
  // call per product, exactly as Google's own multi-product setup docs show,
  // instead of loading gtag.js twice.
  const gtagBootstrapId = ga4Id || googleAdsId;
  const adsConversionSendTo = googleAdsId && googleAdsConversionLabel ? `${googleAdsId}/${googleAdsConversionLabel}` : undefined;

  return (
    <>
      {gtmId && <GoogleTagManager gtmId={gtmId} />}

      {gtagBootstrapId && (
        <>
          <Script
            id="gtag-lib"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagBootstrapId)}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {[
              "window.dataLayer = window.dataLayer || [];",
              "function gtag(){window.dataLayer.push(arguments);}",
              "window.gtag = gtag;",
              "gtag('js', new Date());",
              ga4Id ? `gtag('config', ${JSON.stringify(ga4Id)});` : "",
              googleAdsId ? `gtag('config', ${JSON.stringify(googleAdsId)});` : "",
              adsConversionSendTo ? `window.__googleAdsConversionSendTo = ${JSON.stringify(adsConversionSendTo)};` : "",
            ]
              .filter(Boolean)
              .join("\n")}
          </Script>
        </>
      )}

      {metaPixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(metaPixelId)});
fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height={1}
              width={1}
              alt=""
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {clarityId && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(clarityId)});`}
        </Script>
      )}
    </>
  );
}
