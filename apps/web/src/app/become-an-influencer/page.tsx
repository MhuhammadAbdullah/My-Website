import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getInfluencerFlags } from "@/lib/influencer-flags";
import { InfluencerAuthPageClient } from "@/components/influencer/auth-page-client";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    seo: null,
    fallbackTitle: "Become an Influencer",
    fallbackDescription: "Apply to join our Influencer Marketplace — get matched with brand campaigns and get paid for your content.",
  });
}

export default async function BecomeAnInfluencerPage() {
  const flags = await getInfluencerFlags();
  return <InfluencerAuthPageClient initialMode="register" registrationFlags={flags} />;
}
