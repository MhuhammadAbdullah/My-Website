"use client";

import * as React from "react";
import type { InfluencerFlags } from "@/lib/types";
import { InfluencerAuthFlow } from "./auth-flow";

type Mode = "register" | "login";

interface AuthModalContextValue {
  openAuthModal: (mode: Mode) => void;
}

const AuthModalContext = React.createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = React.useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

const MODE_PATH: Record<Mode, string> = {
  register: "/become-an-influencer",
  login: "/influencer/login",
};

// Mounted once in the root layout, wrapping the whole app. Opening the modal
// is pure React state -- the page you were on is never unmounted or
// re-navigated, so there's nothing that can cause it to reflow/scroll/jump.
// The URL bar still updates (via history.pushState, not router.push) purely
// for shareability/refresh correctness; Next's router is never involved, so
// there's no route-interception behavior to rely on or debug.
export function AuthModalProvider({
  children,
  registrationFlags,
}: {
  children: React.ReactNode;
  registrationFlags: InfluencerFlags;
}) {
  const [state, setState] = React.useState<{ mode: Mode; returnUrl: string } | null>(null);

  const openAuthModal = React.useCallback((mode: Mode) => {
    const returnUrl = window.location.pathname + window.location.search;
    window.history.pushState({ influencerAuthModal: true }, "", MODE_PATH[mode]);
    setState({ mode, returnUrl });
  }, []);

  const close = React.useCallback(() => {
    setState((current) => {
      if (current && window.location.pathname === MODE_PATH[current.mode]) {
        window.history.pushState(null, "", current.returnUrl);
      }
      return null;
    });
  }, []);

  // Closes the modal on the browser's native Back/Forward buttons too, not
  // just our own X/Escape/backdrop-click -- otherwise pressing Back would
  // change the URL back to returnUrl while the modal stayed open.
  React.useEffect(() => {
    function handlePopState() {
      setState((current) => (current ? null : current));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal }}>
      {children}
      {state && <InfluencerAuthFlow initialMode={state.mode} registrationFlags={registrationFlags} onRequestClose={close} />}
    </AuthModalContext.Provider>
  );
}
