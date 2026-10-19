import type { Metadata } from "next";
import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumb, Container, Heading, cn } from "@agency/ui";
import { contactPageSchema } from "@agency/types";
import { resolveGoogleMapsEmbedSrc } from "@agency/utils";
import { getFaqs, getPageSeo, getSettings, getContactPageContent } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { EMPTY_CONTACT_PAGE_CONTENT } from "@/lib/fallbacks";
import { ContactWizard } from "@/components/contact/contact-wizard";
import { FaqSection } from "@/components/sections/faq";
import { buildPageMetadata } from "@/lib/seo";
import { getBrandName } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, brand] = await Promise.all([getPageSeo("contact").catch(() => null), getBrandName()]);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Contact",
    fallbackDescription: `Start a project${brand ? ` with ${brand}` : ""} — get a response within one business day.`,
  });
}

function Channel({ tag, title, sub, href, primary, external }: { tag: string; title: string; sub: string; href: string; primary?: boolean; external?: boolean }) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cn(
        "group flex min-h-[10.5rem] min-w-0 flex-col rounded-[var(--radius-xl)] border p-5 transition-colors",
        primary ? "border-transparent bg-accent-500 text-[#0b0b0c]" : "border-neutral-200 bg-neutral-50 hover:border-accent-500",
      )}
    >
      <span className="flex items-center justify-between text-label font-bold uppercase tracking-wider">
        <span className={primary ? "" : "text-neutral-500"}>{tag}</span>
        <ArrowUpRight className="size-3.5" aria-hidden />
      </span>
      <span className={cn("mt-auto [overflow-wrap:anywhere] font-heading font-extrabold leading-tight", primary ? "text-[#0b0b0c]" : "text-heading")} style={{ fontSize: "clamp(1.15rem, 0.9rem + 0.7vw, 1.6rem)" }}>
        {title}
      </span>
      <span className={cn("mt-2 text-label", primary ? "text-[#0b0b0c]/75" : "text-neutral-500")}>{sub}</span>
    </Link>
  );
}

export default async function ContactPage() {
  const [settings, faqs, content] = await Promise.all([
    withFallback(getSettings(), {}, "site settings"),
    withFallback(getFaqs("CONTACT"), [], "faqs"),
    withFallback(getContactPageContent(), null, "contact page content").then((item) => item ?? EMPTY_CONTACT_PAGE_CONTENT),
  ]);

  // Everything except contact details (Site Settings) and the hero (Page Content) is managed in Admin > Contact > Page Sections.
  const cfg = contactPageSchema.parse(settings.contact_page ?? {});
  const hours = Object.entries(settings.business_hours ?? {});
  const mapSrc = resolveGoogleMapsEmbedSrc(settings.google_maps_embed_code, settings.google_maps_embed);
  const email = settings.contact_email;
  const wa = settings.whatsapp_number?.replace(/[^\d]/g, "");
  const directions =
    cfg.studio.mapLink ||
    (settings.google_maps_embed?.startsWith("http") ? settings.google_maps_embed : settings.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}` : "");
  const ch = cfg.channels;

  return (
    <>
      <section className="pb-8 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-end">
            <Heading level={1} style={{ fontSize: "clamp(1.75rem, 0.5rem + 3.8vw, 4.5rem)" }}>
              {content.heroHeading}
            </Heading>
            {(cfg.status.text || cfg.status.hours || cfg.status.reply) && (
              <div className="rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-5 text-label text-neutral-500">
                {cfg.status.text && (
                  <p className="flex items-center gap-2 text-body-sm font-semibold text-heading">
                    <span className="size-2 rounded-full bg-accent-500" aria-hidden /> {cfg.status.text}
                  </p>
                )}
                {cfg.status.hours && <p className="mt-2">{cfg.status.hours}</p>}
                {cfg.status.reply && <p className="mt-1">{cfg.status.reply}</p>}
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="pb-[var(--spacing-section)]">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {email && <Channel primary tag={ch.email.tag} title={ch.email.title || email} sub={ch.email.sub} href={`mailto:${email}`} />}
            {wa && <Channel tag={ch.whatsapp.tag} title={ch.whatsapp.title || content.whatsappLabel} sub={ch.whatsapp.sub} href={`https://wa.me/${wa}`} external />}
            {settings.calendly_url && <Channel tag={ch.call.tag} title={ch.call.title || content.calendlyLabel} sub={ch.call.sub} href={settings.calendly_url} external />}
            {ch.influencers.title && <Channel tag={ch.influencers.tag} title={ch.influencers.title} sub={ch.influencers.sub} href={ch.influencers.href || "/influencers"} />}
          </div>

          <div className="mt-10">
            <React.Suspense fallback={null}>
              <ContactWizard form={cfg.form} />
            </React.Suspense>
          </div>
        </Container>
      </section>

      {(settings.address || mapSrc) && (
        <section className="pb-[var(--spacing-section)]">
          <Container className="grid gap-5 lg:grid-cols-[22rem_1fr]">
            <div className="flex flex-col rounded-[var(--radius-2xl)] bg-accent-500 p-8 text-[#0b0b0c]">
              {cfg.studio.tag && <p className="text-label font-bold uppercase tracking-wider">{cfg.studio.tag}</p>}
              {settings.address && (
                <p className="mt-5 font-heading font-extrabold leading-tight" style={{ fontSize: "clamp(1.5rem, 1rem + 1.4vw, 2.25rem)" }}>
                  {settings.address}
                </p>
              )}
              <div className="mt-5 space-y-1 text-body-sm">
                {hours.map(([day, time]) => (
                  <p key={day}>
                    <span className="capitalize">{day.replace(/_/g, "–")}</span> · {time}
                  </p>
                ))}
                {cfg.studio.note && <p>{cfg.studio.note}</p>}
              </div>
              {directions && cfg.studio.directions && (
                <Link href={directions} target="_blank" rel="noreferrer" className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#0b0b0c] px-6 py-3 text-body-sm font-bold text-[#f2f2ee] hover:opacity-90">
                  {cfg.studio.directions} <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              )}
            </div>
            <div className="min-h-[18rem] overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50">
              {mapSrc && <iframe src={mapSrc} className="map-dark size-full min-h-[18rem]" loading="lazy" title="Office location" referrerPolicy="no-referrer-when-downgrade" />}
            </div>
          </Container>
        </section>
      )}

      {faqs.length > 0 && <FaqSection content={{ heading: cfg.faqHeading, faqs, firstOpen: true }} />}
    </>
  );
}
