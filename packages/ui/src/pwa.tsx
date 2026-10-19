"use client";

import * as React from "react";
import { Download, Plus, Share, X } from "lucide-react";

// Registers the service worker. The app passes `enabled` (production only: in dev it would cache stale code).
export function PwaRegister({ swUrl = "/sw.js", enabled = true }: { swUrl?: string; enabled?: boolean }) {
  React.useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register(swUrl, { scope: "/" }).catch(() => {
        /* unsupported or blocked: the site simply works without offline support */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, [swUrl, enabled]);
  return null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaInstallLabels {
  title: string;
  description: string;
  install: string;
  later: string;
  iosTitle: string;
  iosStep1: string;
  iosStep2: string;
  gotIt: string;
}

const DEFAULT_LABELS: PwaInstallLabels = {
  title: "Install the app",
  description: "Add it to your home screen or desktop for faster access and offline support.",
  install: "Install",
  later: "Not now",
  iosTitle: "Install on iPhone / iPad",
  iosStep1: "Tap the Share button in Safari",
  iosStep2: "Choose “Add to Home Screen”",
  gotIt: "Got it",
};

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 14;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

// "Install app" banner: Android and desktop Chrome/Edge use the browser's install prompt; iPhone/iPad
// (which has none) get a short "Share -> Add to Home Screen" guide. Hidden once installed or dismissed.
export function PwaInstallPrompt({ appName, iconUrl, labels, delayMs = 6000 }: { appName: string; iconUrl: string; labels?: Partial<PwaInstallLabels>; delayMs?: number }) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [mode, setMode] = React.useState<"native" | "ios" | null>(null);
  const [visible, setVisible] = React.useState(false);
  const deferred = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (m: "native" | "ios") => {
      setMode(m);
      timer = setTimeout(() => setVisible(true), delayMs);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      clearTimeout(timer);
      show("native");
    };
    const onInstalled = () => {
      deferred.current = null;
      setVisible(false);
      setMode(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIos()) show("ios");
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [delayMs]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable: it will simply show again next visit */
    }
  }

  async function install() {
    const evt = deferred.current;
    if (!evt) return dismiss();
    await evt.prompt();
    const choice = await evt.userChoice.catch(() => null);
    deferred.current = null;
    if (choice?.outcome === "accepted") setVisible(false);
    else dismiss();
  }

  if (!visible || !mode) return null;

  return (
    <div role="dialog" aria-label={l.title} className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md animate-[fade-up_0.5s_ease-out] items-start gap-3 rounded-2xl border border-neutral-200 bg-background p-4 shadow-soft-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:mx-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- generated app icon */}
      <img src={iconUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-bold text-heading">{mode === "ios" ? l.iosTitle : `${l.title}${appName ? ` — ${appName}` : ""}`}</p>
        {mode === "native" ? (
          <>
            <p className="mt-1 text-label text-neutral-500">{l.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={install} className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2 text-body-sm font-bold text-on-accent hover:opacity-90">
                <Download className="size-4" aria-hidden /> {l.install}
              </button>
              <button type="button" onClick={dismiss} className="rounded-full border border-neutral-300 px-4 py-2 text-body-sm font-semibold text-heading hover:border-accent-500">
                {l.later}
              </button>
            </div>
          </>
        ) : (
          <>
            <ol className="mt-2 space-y-1.5 text-label text-neutral-500">
              <li className="flex items-center gap-2">
                <Share className="size-4 shrink-0 text-accent-500" aria-hidden /> {l.iosStep1}
              </li>
              <li className="flex items-center gap-2">
                <Plus className="size-4 shrink-0 text-accent-500" aria-hidden /> {l.iosStep2}
              </li>
            </ol>
            <button type="button" onClick={dismiss} className="mt-3 rounded-full border border-neutral-300 px-4 py-2 text-body-sm font-semibold text-heading hover:border-accent-500">
              {l.gotIt}
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Close" className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100">
        <X className="size-4" />
      </button>
    </div>
  );
}
