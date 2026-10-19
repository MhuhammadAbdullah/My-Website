import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Info, Star } from "lucide-react";
import { Breadcrumb, Container, Heading, cn } from "@agency/ui";
import { affiliatePageSchema } from "@agency/types";
import { getAffiliateTools, getPageSeo, getAffiliateToolsPageContent, getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { emptyPage, EMPTY_AFFILIATE_TOOLS_PAGE_CONTENT } from "@/lib/fallbacks";
import { AffiliateExplorer, type AffiliateItem } from "@/components/affiliate/affiliate-explorer";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { buildPageMetadata } from "@/lib/seo";
import { getBrandName } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, brand] = await Promise.all([getPageSeo("affiliate-tools").catch(() => null), getBrandName()]);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Affiliate Tools",
    fallbackDescription: `The hosting, domain, email, design, and productivity tools ${brand || "we"} actually use and recommend.`,
  });
}

// "Get a 20% Discount - code ABC" -> badge "-20%", code "ABC"
const percent = (offer: string | null) => offer?.match(/(\d{1,3})\s*%/)?.[1] ?? "";
const promoCode = (offer: string | null) => offer?.match(/\bcode[:\s]+([A-Za-z0-9_-]{3,})/i)?.[1] ?? "";

export default async function AffiliateToolsPage() {
  const [toolsPage, content, settings] = await Promise.all([
    // All published tools at once (the API caps a page at 100): filtering and search then happen instantly in the browser.
    withFallback(getAffiliateTools({ page: 1, pageSize: 100 }), emptyPage(1, 100), "affiliate tools"),
    withFallback(getAffiliateToolsPageContent(), null, "affiliate tools page content").then((item) => item ?? EMPTY_AFFILIATE_TOOLS_PAGE_CONTENT),
    withFallback(getSettings(), {}, "site settings"),
  ]);

  // Everything except the tools themselves is managed in Admin > Affiliate Tools > Page Sections.
  const cfg = affiliatePageSchema.parse(settings.affiliate_page ?? {});
  const raw = toolsPage.items;
  const items: AffiliateItem[] = raw.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category.name,
    categorySlug: t.category.slug,
    description: t.description,
    benefits: t.benefits,
    badge: percent(t.specialOffer) ? `-${percent(t.specialOffer)}%` : "",
    code: promoCode(t.specialOffer),
    why: t.disclosureNote?.trim() ?? "",
    url: t.ctaUrl,
    ctaLabel: t.ctaLabel || "Visit site",
    isFeatured: t.isFeatured,
    logo: t.logo?.url ?? null,
  }));

  const pickTool = raw.find((t) => t.slug === cfg.pick.toolSlug) ?? raw.find((t) => t.isFeatured) ?? raw[0];
  const pickPct = pickTool ? percent(pickTool.specialOffer) : "";
  const pickButton = cfg.pick.buttonLabel || (pickPct ? `Get ${pickPct}% off` : pickTool?.ctaLabel || "Visit site");
  const hasRating = cfg.pick.rating || cfg.pick.pros.some(Boolean) || cfg.pick.con;
  const cmp = cfg.compare;
  const hasCompare = cmp.columns.length > 0 && cmp.rows.length > 0;

  return (
    <>
      <section className="pb-6 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Affiliate Tools" }]} />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-end">
            <Heading level={1} style={{ fontSize: "clamp(2.5rem, 0.5rem + 6vw, 6.5rem)" }}>
              {content.heroHeading}
            </Heading>
            {content.heroDescription && <p className="text-body text-neutral-500 lg:pb-4">{content.heroDescription}</p>}
          </div>
          {content.disclosureText && (
            <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-xl)] border border-neutral-200 p-4 text-body-sm text-neutral-500">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-on-accent">
                <Info className="size-3.5" aria-hidden />
              </span>
              <p>
                <strong className="text-heading">Affiliate disclosure:</strong> {content.disclosureText}
              </p>
            </div>
          )}
        </Container>
      </section>

      {pickTool && (
        <section className="pb-[var(--spacing-section)] pt-4">
          <Container>
            <div className="grid gap-8 rounded-[var(--radius-2xl)] bg-accent-500 p-8 text-[#0b0b0c] sm:p-12 lg:grid-cols-[1fr_20rem] lg:items-center">
              <div>
                {cfg.pick.tag && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0b0b0c] px-3 py-1 text-label font-bold uppercase tracking-wider text-accent-500">
                    <Star className="size-3 fill-current" aria-hidden /> {cfg.pick.tag}
                  </span>
                )}
                <Heading level={2} className="mt-5 !text-[#0b0b0c]" style={{ fontSize: "clamp(1.9rem, 1rem + 3.4vw, 4rem)" }}>
                  {pickTool.name}
                </Heading>
                <p className="mt-5 max-w-2xl text-body !text-[#0b0b0c]/80">{pickTool.description}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href={pickTool.ctaUrl} target="_blank" rel="noreferrer sponsored" className="inline-flex items-center gap-2 rounded-full bg-[#0b0b0c] px-6 py-3 text-body-sm font-bold text-[#f2f2ee] hover:opacity-90">
                    {pickButton} <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                  {hasCompare && cfg.pick.compareLabel && (
                    <a href="#compare" className="inline-flex items-center rounded-full border border-[#0b0b0c] px-6 py-3 text-body-sm font-bold hover:bg-[#0b0b0c]/10">
                      {cfg.pick.compareLabel}
                    </a>
                  )}
                </div>
              </div>
              {hasRating && (
                <div className="rounded-[var(--radius-xl)] bg-[#0b0b0c] p-6 text-[#f2f2ee]">
                  {cfg.pick.rating && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-label uppercase tracking-wider text-[#a3a3a3]">{cfg.pick.ratingLabel}</span>
                      <span className="font-heading text-h3 font-extrabold text-accent-500">
                        [{cfg.pick.rating}]/{cfg.pick.ratingMax}
                      </span>
                    </div>
                  )}
                  <ul className="mt-4 space-y-2 text-body-sm">
                    {cfg.pick.pros.filter(Boolean).map((p, i) => (
                      <li key={i}>
                        <span className="mr-2 text-accent-500">+</span>
                        {p}
                      </li>
                    ))}
                    {cfg.pick.con && (
                      <li className="text-[#a3a3a3]">
                        <span className="mr-2">−</span>
                        {cfg.pick.con}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </Container>
        </section>
      )}

      <section className="pb-[var(--spacing-section)]">
        <Container>
          <AffiliateExplorer tools={items} labels={cfg.labels} />
        </Container>
      </section>

      {hasCompare && (
        <section id="compare" className="scroll-mt-24 pb-[var(--spacing-section)]">
          <Container>
            <Heading level={2} className="mb-8" style={{ fontSize: "clamp(2rem, 1rem + 3.4vw, 4.5rem)" }}>
              {cmp.heading}
            </Heading>
            <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-neutral-200">
              <table className="w-full min-w-[34rem] border-collapse text-left text-body-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-5 py-4 text-label font-semibold uppercase tracking-wider text-neutral-500">{cmp.featureLabel}</th>
                    {cmp.columns.map((c, i) => (
                      <th key={i} className={cn("px-5 py-4 font-semibold", c.highlight ? "text-accent-500" : "text-heading")}>
                        {c.name}
                        {c.highlight && " ★"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cmp.rows.map((r, ri) => (
                    <tr key={ri} className="border-b border-neutral-200 last:border-0">
                      <td className="px-5 py-4 text-neutral-500">{r.feature}</td>
                      {cmp.columns.map((c, ci) => (
                        <td key={ci} className={cn("px-5 py-4", c.highlight ? "font-bold text-heading" : "text-heading")}>
                          {r.values[ci] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </section>
      )}

      <section className="pb-[var(--spacing-section)]">
        <Container className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50 p-8">
            <Heading level={3} style={{ fontSize: "clamp(1.5rem, 1rem + 1.4vw, 2.25rem)" }}>
              {cfg.newsletter.heading}
            </Heading>
            <p className="mt-3 text-body-sm text-neutral-500">{cfg.newsletter.text}</p>
            <NewsletterForm placeholder={cfg.newsletter.placeholder} buttonLabel={cfg.newsletter.button} successMessage={cfg.newsletter.success} errorMessage={cfg.newsletter.error} />
          </div>
          <div className="rounded-[var(--radius-2xl)] bg-[var(--inv-bg,#f2f2ee)] p-8 text-[var(--inv-fg,#0b0b0c)]">
            <Heading level={3} className="!text-[var(--inv-fg,#0b0b0c)] [&_em]:!text-[var(--inv-fg,#0b0b0c)]" style={{ fontSize: "clamp(1.5rem, 1rem + 1.4vw, 2.25rem)" }}>
              {cfg.setup.heading}
            </Heading>
            <p className="mt-3 text-body-sm text-[var(--inv-fg,#3f3f46)] opacity-80">{cfg.setup.text}</p>
            {cfg.setup.button.label && (
              <Link href={cfg.setup.button.href || "/contact"} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--inv-fg,#0b0b0c)] px-6 py-3 text-body-sm font-bold text-[var(--inv-bg,#f2f2ee)] hover:opacity-90">
                {cfg.setup.button.label} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
