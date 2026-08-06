"use client";

import { Button } from "@agency/ui";
import { useAuthModal } from "./auth-modal-provider";

// Opens the shared auth modal via context instead of <Link> -- no
// navigation happens, so the influencer grid behind it never unmounts,
// re-renders, or scrolls.
export function InfluencerAuthButtons({ registrationEnabled }: { registrationEnabled: boolean }) {
  const { openAuthModal } = useAuthModal();

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 sm:shrink-0 sm:gap-3">
      <Button
        variant="outline"
        size="lg"
        className="h-9 px-4 text-label sm:h-13 sm:px-8 sm:text-[length:var(--text-body)]"
        onClick={() => openAuthModal("login")}
      >
        Login
      </Button>
      {registrationEnabled && (
        <Button
          size="lg"
          className="h-9 px-4 text-label sm:h-13 sm:px-8 sm:text-[length:var(--text-body)]"
          onClick={() => openAuthModal("register")}
        >
          Become an Influencer
        </Button>
      )}
    </div>
  );
}
