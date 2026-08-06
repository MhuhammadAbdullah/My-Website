"use client";

import * as React from "react";
import { DialogHeader, DialogTitle } from "@agency/ui";
import type { InfluencerFlags } from "@/lib/types";
import { InfluencerAuthModal } from "./auth-modal";
import { BecomeInfluencerForm } from "./become-influencer-form";
import { InfluencerLoginForm } from "./influencer-login-form";

type Mode = "register" | "login";

// One Dialog instance shared by both registration and login -- switching
// between them (the "Sign in" / "Apply to become an influencer" links) is
// pure local state plus a cosmetic history.replaceState, never a real
// Next.js navigation, so there's only ever one Dialog mounted at a time.
export function InfluencerAuthFlow({
  initialMode,
  onRequestClose,
  registrationFlags,
}: {
  initialMode: Mode;
  onRequestClose: () => void;
  registrationFlags: InfluencerFlags;
}) {
  const [mode, setMode] = React.useState<Mode>(initialMode);

  function switchTo(next: Mode) {
    setMode(next);
    const url = next === "register" ? "/become-an-influencer" : "/influencer/login";
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <InfluencerAuthModal onRequestClose={onRequestClose} className={mode === "register" ? "max-w-2xl" : "max-w-lg"}>
      {mode === "register" ? (
        <>
          <DialogHeader>
            <DialogTitle>Become an Influencer</DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-neutral-600">
            Apply to join our marketplace and get matched with brand campaigns that fit your audience.
          </p>

          <div className="mt-6">
            {!registrationFlags.registrationEnabled ? (
              <div
                className="rounded-2xl border border-neutral-200 p-8 text-body text-neutral-600"
                dangerouslySetInnerHTML={{
                  __html: registrationFlags.maintenanceNotice || `<p>${registrationFlags.registrationClosedMessage}</p>`,
                }}
              />
            ) : (
              <BecomeInfluencerForm bare onSwitchToLogin={() => switchTo("login")} />
            )}
          </div>
        </>
      ) : (
        <InfluencerLoginForm onSwitchToRegister={() => switchTo("register")} onRequestClose={onRequestClose} />
      )}
    </InfluencerAuthModal>
  );
}
