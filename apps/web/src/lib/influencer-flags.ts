import { getSettings } from "./api";
import type { InfluencerFlags } from "./types";

// Defaults match packages/types/src/settings.ts `influencerFlagsSchema` --
// kept in sync manually since this is a plain hand-rolled read-model type,
// not the zod-inferred one (see SiteSettings in ./types.ts for why).
const DEFAULT_FLAGS: InfluencerFlags = {
  marketplaceEnabled: true,
  registrationEnabled: true,
  bookingsEnabled: true,
  maintenanceNotice: "",
  registrationClosedMessage: "Influencer registrations are currently closed. Please check back later.",
  bookingsDisabledMessage: "Bookings are temporarily unavailable right now. Please check back later.",
};

// `GET /settings` is public/unauthenticated (see apps/api/src/routes/
// settings.routes.ts), so every influencer-marketplace route can read the
// kill-switches directly with zero extra API surface and zero redeploy
// required to flip a toggle from the admin panel. `next: { revalidate: 0 }`
// deliberately opts this one read out of the site-wide 5-minute fetch cache
// every other getSettings() caller relies on (apiFetch's default) -- a
// kill-switch that can take up to 5 minutes to actually kill anything isn't
// a kill-switch, and this endpoint is cheap/low-traffic enough that
// always-fresh is the right tradeoff here specifically. Overriding via
// `next.revalidate` (not `cache: "no-store"`) matters: the two options
// conflict if both end up set on the same fetch call, and apiFetch's base
// config already sets `next: { revalidate: 300 }` -- passing a `next`
// object here replaces that key entirely rather than merging with it.
export async function getInfluencerFlags(): Promise<InfluencerFlags> {
  const settings = await getSettings({ next: { revalidate: 0 } }).catch(() => null);
  return { ...DEFAULT_FLAGS, ...(settings?.influencer_flags ?? {}) };
}
