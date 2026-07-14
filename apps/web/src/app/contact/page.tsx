import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Clock, CalendarClock } from "lucide-react";
import { Container, Section, Heading, Reveal } from "@agency/ui";
import { resolveGoogleMapsEmbedSrc } from "@agency/utils";
import { getFaqs, getPageSeo, getSettings, getContactPageContent } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { EMPTY_CONTACT_PAGE_CONTENT } from "@/lib/fallbacks";
import { ContactForm } from "@/components/contact/contact-form";
import { FaqSection } from "@/components/marketing/faq-section";
import { PageHeading } from "@/components/marketing/page-heading";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("contact").catch(() => null);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Contact",
    fallbackDescription: "Start a project with MAB Digital — get a response within one business day.",
  });
}

export default async function ContactPage() {
  const [settings, faqs, content] = await Promise.all([
    withFallback(getSettings(), {}, "site settings"),
    withFallback(getFaqs("CONTACT"), [], "faqs"),
    withFallback(getContactPageContent(), null, "contact page content").then(
      (item) => item ?? EMPTY_CONTACT_PAGE_CONTENT,
    ),
  ]);
  const hours = settings.business_hours ?? {};
  const mapSrc = resolveGoogleMapsEmbedSrc(settings.google_maps_embed_code, settings.google_maps_embed);

  return (
    <>
      <Section className="pb-0">
        <Container>
          <PageHeading breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact" }]}>
            <Heading level={1} display>
              {content.heroHeading}
            </Heading>
            <p className="mt-5 text-body-lg text-body">{content.heroDescription}</p>
          </PageHeading>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-12 lg:grid-cols-[3fr_2fr]">
          <Reveal className="rounded-3xl border border-neutral-200 p-8">
            <ContactForm />
          </Reveal>

          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-neutral-200 p-6">
              {settings.contact_email && (
                <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-3 text-body-sm text-heading hover:text-accent-600">
                  <Mail className="size-5 text-accent-500" /> {settings.contact_email}
                </a>
              )}
              {settings.whatsapp_number && (
                <a
                  href={`https://wa.me/${settings.whatsapp_number.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-body-sm text-heading hover:text-accent-600"
                >
                  <MessageCircle className="size-5 text-accent-500" /> {content.whatsappLabel}
                </a>
              )}
              {settings.address && (
                <p className="flex items-start gap-3 text-body-sm text-body">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-accent-500" /> {settings.address}
                </p>
              )}
              {Object.keys(hours).length > 0 && (
                <div className="flex items-start gap-3 text-body-sm text-body">
                  <Clock className="mt-0.5 size-5 shrink-0 text-accent-500" />
                  <div>
                    {Object.entries(hours).map(([day, time]) => (
                      <p key={day}>
                        <span className="capitalize text-heading">{day.replace(/_/g, "–")}:</span> {time}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {settings.calendly_url && (
                <Link
                  href={settings.calendly_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-body-sm text-heading hover:text-accent-600"
                >
                  <CalendarClock className="size-5 text-accent-500" /> {content.calendlyLabel}
                </Link>
              )}
            </div>

            {mapSrc && (
              <div className="aspect-video overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                <iframe
                  src={mapSrc}
                  className="h-full w-full"
                  loading="lazy"
                  title="Office location"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <FaqSection faqs={faqs} />
        </Container>
      </Section>
    </>
  );
}
