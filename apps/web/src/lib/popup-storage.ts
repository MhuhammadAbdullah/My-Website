import type { PopupFrequencyInput } from "@agency/types";

// All storage access is wrapped in try/catch -- localStorage/sessionStorage
// throw in private-browsing modes on some browsers (notably older Safari),
// and a popup silently failing to respect frequency capping is a far better
// failure mode than crashing the page.

const STATE_PREFIX = "popup_state_";
const SESSION_SHOWN_PREFIX = "popup_shown_session_";
const PAGE_VIEWS_KEY = "popup_page_views";

interface PopupClientState {
  lastShownAt: number;
  impressions: number;
}

function readState(id: string): PopupClientState {
  try {
    const raw = localStorage.getItem(STATE_PREFIX + id);
    if (!raw) return { lastShownAt: 0, impressions: 0 };
    const parsed = JSON.parse(raw);
    return { lastShownAt: Number(parsed.lastShownAt) || 0, impressions: Number(parsed.impressions) || 0 };
  } catch {
    return { lastShownAt: 0, impressions: 0 };
  }
}

function writeState(id: string, state: PopupClientState): void {
  try {
    localStorage.setItem(STATE_PREFIX + id, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const HOUR_MS = 60 * 60 * 1000;

// Whether this popup is currently allowed to show, per its frequency mode --
// checked BEFORE attaching a trigger listener, so a capped popup never even
// starts its delay/scroll/exit-intent countdown.
export function isPopupEligibleByFrequency(id: string, frequency: PopupFrequencyInput): boolean {
  const state = readState(id);
  if (frequency.maxImpressionsPerUser && state.impressions >= frequency.maxImpressionsPerUser) {
    return false;
  }

  switch (frequency.mode) {
    case "EVERY_VISIT":
      return true;
    case "SESSION":
      try {
        return sessionStorage.getItem(SESSION_SHOWN_PREFIX + id) !== "1";
      } catch {
        return true;
      }
    case "DAY":
      return Date.now() - state.lastShownAt >= 24 * HOUR_MS;
    case "WEEK":
      return Date.now() - state.lastShownAt >= 7 * 24 * HOUR_MS;
    case "CUSTOM":
      return Date.now() - state.lastShownAt >= (frequency.customHours ?? 24) * HOUR_MS;
    default:
      return true;
  }
}

// Called once a popup actually becomes visible to the user (trigger fired),
// not merely once it's picked as eligible -- records what frequency-capping
// needs to know next time.
export function recordPopupShown(id: string, frequency: PopupFrequencyInput): void {
  const state = readState(id);
  writeState(id, { lastShownAt: Date.now(), impressions: state.impressions + 1 });
  if (frequency.mode === "SESSION") {
    try {
      sessionStorage.setItem(SESSION_SHOWN_PREFIX + id, "1");
    } catch {
      // ignore
    }
  }
}

// Site-wide "how many pages has this visitor viewed this session" counter
// for the PAGE_VIEWS trigger -- incremented once per route change by
// PopupProvider, independent of which (if any) popup is currently eligible.
export function incrementPageViewCount(): number {
  try {
    const current = Number(sessionStorage.getItem(PAGE_VIEWS_KEY)) || 0;
    const next = current + 1;
    sessionStorage.setItem(PAGE_VIEWS_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function getPageViewCount(): number {
  try {
    return Number(sessionStorage.getItem(PAGE_VIEWS_KEY)) || 0;
  } catch {
    return 0;
  }
}
