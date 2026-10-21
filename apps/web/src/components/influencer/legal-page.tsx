import { Breadcrumb, Container, Heading, RichText } from "@agency/ui";
import { influencerLegalPageSchema, type InfluencerLegalKey } from "@agency/types";
import { getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";

const DEFAULT_TITLES: Record<InfluencerLegalKey, string> = {
  influencer_terms: "Influencer Terms & Conditions",
  influencer_privacy: "Influencer Privacy Policy",
};

// Shared by /influencer/terms and /influencer/privacy-policy. The text is written in Admin > Influencer Marketplace > Legal.
export async function InfluencerLegalPage({ settingKey }: { settingKey: InfluencerLegalKey }) {
  const settings = await withFallback(getSettings({ next: { revalidate: 30 } }), {}, "site settings");
  const parsed = influencerLegalPageSchema.safeParse(settings[settingKey] ?? { title: DEFAULT_TITLES[settingKey] });
  const page = parsed.success ? parsed.data : { title: DEFAULT_TITLES[settingKey], content: "", lastUpdated: "", published: false };
  const available = page.published && page.content.trim().length > 0;

  return (
    <section className="pb-[var(--spacing-section)] pt-4">
      <Container className="max-w-4xl">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Influencers", href: "/influencers" }, { label: page.title }]} />
        <Heading level={1} className="mt-8" style={{ fontSize: "clamp(1.75rem, 1rem + 2.2vw, 3rem)" }}>
          {page.title}
        </Heading>
        {available && page.lastUpdated && <p className="mt-4 text-body-sm text-neutral-500">Last updated: {page.lastUpdated}</p>}
        <div className="mt-10">
          {available ? (
            <RichText html={page.content} />
          ) : (
            <p className="rounded-[var(--radius-xl)] border border-dashed border-neutral-300 p-8 text-body text-neutral-500">This page has not been published yet. Please check back soon.</p>
          )}
        </div>
      </Container>
    </section>
  );
}
