import { prisma } from "@agency/database";

// Server-side mirror of apps/web/src/lib/influencer-flags.ts's defaults --
// the web app's copy exists purely so it can present a friendly message
// without a round trip through this file; this one is the actual
// enforcement point. Hiding the "Become an Influencer" form on the frontend
// is not the same as *preventing* new registrations (brief §29) -- without
// this check, POST /influencer-applications stayed reachable directly
// regardless of the toggle.
interface InfluencerFlags {
  marketplaceEnabled: boolean;
  registrationEnabled: boolean;
  bookingsEnabled: boolean;
  bookingsDisabledMessage: string;
}

const DEFAULT_FLAGS: InfluencerFlags = {
  marketplaceEnabled: true,
  registrationEnabled: true,
  bookingsEnabled: true,
  bookingsDisabledMessage: "Bookings are temporarily unavailable right now. Please check back later.",
};

export async function getInfluencerFlags(): Promise<InfluencerFlags> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "influencer_flags" } });
  const value = setting?.value as Partial<InfluencerFlags> | undefined;
  return { ...DEFAULT_FLAGS, ...value };
}
