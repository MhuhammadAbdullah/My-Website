"use client";

import { useRouter } from "next/navigation";
import type { InfluencerFlags } from "@/lib/types";
import { InfluencerAuthFlow } from "./auth-flow";

// Renders the real /become-an-influencer and /influencer/login routes for
// direct loads/refreshes (typed URL, bookmark, or reset-password's email
// link) -- there's no previous in-app page to return to here, so closing
// pushes to a sensible fallback instead of the AuthModalProvider's
// history-restore behavior.
export function InfluencerAuthPageClient({
  initialMode,
  registrationFlags,
}: {
  initialMode: "register" | "login";
  registrationFlags: InfluencerFlags;
}) {
  const router = useRouter();
  const fallback = initialMode === "register" ? "/influencers" : "/";

  return (
    <InfluencerAuthFlow initialMode={initialMode} registrationFlags={registrationFlags} onRequestClose={() => router.push(fallback)} />
  );
}
