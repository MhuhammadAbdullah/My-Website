import type { Metadata } from "next";
import { InfluencerLegalPage } from "@/components/influencer/legal-page";
import { buildPageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return buildPageMetadata({ seo: null, fallbackTitle: "Influencer Terms & Conditions", fallbackDescription: "The terms that apply to creators on our influencer marketplace." });
}

export default function InfluencerTermsPage() {
  return <InfluencerLegalPage settingKey="influencer_terms" />;
}
