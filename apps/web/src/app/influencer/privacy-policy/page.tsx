import type { Metadata } from "next";
import { InfluencerLegalPage } from "@/components/influencer/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return buildPageMetadata({ seo: null, fallbackTitle: "Influencer Privacy Policy", fallbackDescription: "How we handle the information creators share with our influencer marketplace." });
}

export default function InfluencerPrivacyPage() {
  return <InfluencerLegalPage settingKey="influencer_privacy" />;
}
