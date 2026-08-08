"use client";

import * as React from "react";
import type { PopupTriggerInput } from "@agency/types";
import { getPageViewCount } from "@/lib/popup-storage";

// Attaches exactly one trigger listener (or none, for IMMEDIATE/PAGE_VIEWS
// which resolve synchronously) for the currently-selected popup, and tears
// it down whenever `trigger` changes identity -- which happens on every
// route change (PopupProvider re-picks a candidate per pathname) or when the
// eligible popup itself changes. `trigger` is null when no popup is
// currently eligible, in which case nothing is attached at all.
export function usePopupTrigger(trigger: PopupTriggerInput | null, onTrigger: () => void): void {
  const onTriggerRef = React.useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  React.useEffect(() => {
    if (!trigger) return;

    if (trigger.type === "IMMEDIATE") {
      onTriggerRef.current();
      return;
    }

    if (trigger.type === "PAGE_VIEWS") {
      if (getPageViewCount() >= (trigger.pageViewCount ?? 2)) {
        onTriggerRef.current();
      }
      return;
    }

    if (trigger.type === "DELAY") {
      const id = window.setTimeout(() => onTriggerRef.current(), (trigger.delaySeconds ?? 5) * 1000);
      return () => window.clearTimeout(id);
    }

    if (trigger.type === "SCROLL") {
      const threshold = (trigger.scrollPercent ?? 50) / 100;
      let fired = false;
      const handleScroll = () => {
        if (fired) return;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = scrollable > 0 ? window.scrollY / scrollable : 1;
        if (ratio >= threshold) {
          fired = true;
          onTriggerRef.current();
        }
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }

    if (trigger.type === "EXIT_INTENT") {
      let fired = false;
      const handleMouseLeave = (e: MouseEvent) => {
        if (fired || e.clientY > 0) return;
        fired = true;
        onTriggerRef.current();
      };
      document.addEventListener("mouseleave", handleMouseLeave);
      return () => document.removeEventListener("mouseleave", handleMouseLeave);
    }
  }, [trigger]);
}
