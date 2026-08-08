"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { PopupRead } from "@/lib/types";
import { matchesTargeting, matchesDevice } from "@/lib/popup-matching";
import { isPopupEligibleByFrequency, recordPopupShown, incrementPageViewCount } from "@/lib/popup-storage";
import { trackPopupImpression, trackPopupClick } from "@/lib/popup-tracking";
import { usePopupTrigger } from "./use-popup-trigger";
import { PopupRenderer } from "./popup-renderer";

// Mounted once in SiteChrome (dynamic-imported, ssr:false -- popups are a
// fully client-driven overlay, no reason to include them in the SSR payload
// or main bundle). `popups` is the schedule-filtered list from
// GET /popups/active, already sorted by priority; targeting/device/
// frequency are evaluated here since pathname and viewport are only known
// client-side.
export function PopupProvider({ popups }: { popups: PopupRead[] }) {
  const pathname = usePathname();
  const [activePopup, setActivePopup] = React.useState<PopupRead | null>(null);
  const [visibleId, setVisibleId] = React.useState<string | null>(null);

  React.useEffect(() => {
    incrementPageViewCount();
    setVisibleId(null);

    if (popups.length === 0) {
      setActivePopup(null);
      return;
    }

    // Only one popup shows at a time -- the highest-priority one (list is
    // already priority-sorted) whose targeting/device/frequency all pass.
    const eligible = popups.find(
      (p) => matchesTargeting(pathname, p.targeting) && matchesDevice(p.deviceTarget) && isPopupEligibleByFrequency(p.id, p.frequency),
    );
    setActivePopup(eligible ?? null);
  }, [pathname, popups]);

  const handleTrigger = React.useCallback(() => {
    if (!activePopup) return;
    setVisibleId(activePopup.id);
    recordPopupShown(activePopup.id, activePopup.frequency);
    trackPopupImpression(activePopup.id);
  }, [activePopup]);

  usePopupTrigger(activePopup?.trigger ?? null, handleTrigger);

  if (!activePopup || visibleId !== activePopup.id) return null;

  return <PopupRenderer popup={activePopup} onClose={() => setVisibleId(null)} onCtaClick={() => trackPopupClick(activePopup.id)} />;
}
