import { getInfluencerFlags } from "@/lib/influencer-flags";
import { InfluencerAuthPageClient } from "@/components/influencer/auth-page-client";

export default async function InfluencerLoginPage() {
  const flags = await getInfluencerFlags();
  return <InfluencerAuthPageClient initialMode="login" registrationFlags={flags} />;
}
