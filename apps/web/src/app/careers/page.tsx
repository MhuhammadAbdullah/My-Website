import type { Metadata } from "next";
import { Breadcrumb, Container, Heading } from "@agency/ui";
import { careersPageSchema } from "@agency/types";
import { getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { buildPageMetadata } from "@/lib/seo";
import { CareersExplorer } from "@/components/careers/careers-explorer";
import { ApplyButton } from "@/components/careers/apply-dialog";

export function generateMetadata(): Metadata {
  return buildPageMetadata({
    seo: null,
    fallbackTitle: "Careers",
    fallbackDescription: "Open roles at our agency: see the positions, departments and how to apply.",
  });
}

export default async function CareersPage() {
  const settings = await withFallback(getSettings(), {}, "site settings");
  // Everything on this page is managed in Admin > Content > Careers.
  const cfg = careersPageSchema.parse(settings.careers_page ?? {});
  const open = cfg.positions.filter((p) => p.open);

  return (
    <>
      <section className="pb-10 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Careers" }]} />
          <div className="mt-8 max-w-5xl">
            {cfg.hero.eyebrow && <p className="eyebrow mb-4">{cfg.hero.eyebrow}</p>}
            <Heading level={1} style={{ fontSize: "clamp(2.25rem, 0.8rem + 5vw, 5.25rem)" }}>
              {cfg.hero.heading}
            </Heading>
            {cfg.hero.intro && <p className="mt-6 max-w-xl text-body text-neutral-500">{cfg.hero.intro}</p>}
          </div>
        </Container>
      </section>

      {cfg.perks.some((p) => p.title) && (
        <section className="pb-10">
          <Container className="grid gap-4 md:grid-cols-3">
            {cfg.perks
              .filter((p) => p.title)
              .map((perk, i) => (
                <div key={i} className="rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-6">
                  <p className="font-heading text-h4 font-extrabold text-heading">{perk.title}</p>
                  {perk.text && <p className="mt-2 text-body-sm text-neutral-500">{perk.text}</p>}
                </div>
              ))}
          </Container>
        </section>
      )}

      <section id="positions" className="scroll-mt-24 pb-[var(--spacing-section)]">
        <Container>
          {open.length > 0 ? (
            <CareersExplorer positions={open} apply={cfg.apply} labels={cfg.labels} />
          ) : (
            <div className="rounded-[var(--radius-2xl)] border border-dashed border-neutral-300 p-10 text-center">
              <Heading level={2} style={{ fontSize: "clamp(1.5rem, 1rem + 1.6vw, 2.5rem)" }}>
                {cfg.empty.heading}
              </Heading>
              <p className="mx-auto mt-3 max-w-xl text-body text-neutral-500">{cfg.empty.text}</p>
            </div>
          )}
          {cfg.apply.note && open.length > 0 && <p className="mt-6 text-body-sm text-neutral-500">{cfg.apply.note}</p>}
        </Container>
      </section>

      <section className="pb-[var(--spacing-section)]">
        <Container>
          <div className="rounded-[var(--radius-2xl)] bg-accent-500 p-8 text-[#0b0b0c] sm:p-12">
            <Heading level={2} style={{ fontSize: "clamp(1.75rem, 1rem + 2.4vw, 3.25rem)" }}>
              {cfg.cta.heading}
            </Heading>
            {cfg.cta.text && <p className="mt-3 max-w-xl text-body">{cfg.cta.text}</p>}
            <ApplyButton position="General application" className="mt-6 inline-flex items-center rounded-full bg-[#0b0b0c] px-6 py-3 text-body-sm font-bold text-[#f2f2ee] hover:opacity-90">
              {cfg.cta.buttonLabel}
            </ApplyButton>
          </div>
        </Container>
      </section>
    </>
  );
}
