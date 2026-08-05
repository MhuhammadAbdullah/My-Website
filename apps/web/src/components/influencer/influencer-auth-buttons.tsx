"use client";

import { Button } from "@agency/ui";
import { useAuthModal } from "./auth-modal-provider";

// Opens the shared auth modal via context instead of <Link> -- no
// navigation happens, so the influencer grid behind it never unmounts,
// re-renders, or scrolls.
export function InfluencerAuthButtons({ registrationEnabled }: { registrationEnabled: boolean }) {
  const { openAuthModal } = useAuthModal();

  return (
    <div className="flex shrink-0 flex-wrap gap-3">
      <Button variant="outline" size="lg" onClick={() => openAuthModal("login")}>
        Login
      </Button>
      {registrationEnabled && (
        <Button size="lg" onClick={() => openAuthModal("register")}>
          Become an Influencer
        </Button>
      )}
    </div>
  );
}
