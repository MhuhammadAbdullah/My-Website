import { env } from "./env";

// Fire-and-forget beacons -- unlike submitContactForm's fetch (apps/web/src/lib/api.ts),
// nothing here is awaited, surfaced to the user, or retried. A dropped
// impression/click ping shouldn't block or error out the popup UI; it's
// non-critical analytics, not a user-facing action.
export function trackPopupImpression(id: string): void {
  fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/popups/${id}/impression`, { method: "POST" }).catch(() => {});
}

export function trackPopupClick(id: string): void {
  fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/popups/${id}/click`, { method: "POST" }).catch(() => {});
}
