import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Heading, Reveal } from "@agency/ui";
import { getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";

// Async Server Component: when a page doesn't pass explicit overrides (only
// the Home page does, via HomePageContent.contactCta*), this falls back to
// the sitewide `default_cta` SiteSetting -- admin-editable from Settings —
// instead of a hardcoded literal, so every other page sharing this CTA (About,
// Services, project/service detail pages) stays in sync from one place.
export async function CtaSection({
  headline,
  subheadline,
  ctaLabel,
  ctaHref,
}: {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
} = {}) {
  const needsDefaults = !headline || !subheadline || !ctaLabel || !ctaHref;
  const settings = needsDefaults ? await withFallback(getSettings(), {}, "settings") : null;
  const defaultCta = settings?.default_cta;

  const resolvedHeadline = headline ?? defaultCta?.headline ?? "Ready to build something **inevitable**?";
  const resolvedSubheadline =
    subheadline ??
    defaultCta?.subheadline ??
    "Tell us about your project — most people hear back from us within one business day.";
  const resolvedCtaLabel = ctaLabel ?? defaultCta?.ctaLabel ?? "Start a project";
  const resolvedCtaHref = ctaHref ?? defaultCta?.ctaHref ?? "/contact";

  return (
    <Reveal className="relative overflow-hidden rounded-3xl bg-neutral-950 px-8 py-16 text-center sm:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 50% 0%, oklch(58% 0.19 265 / 0.35), transparent 70%)",
        }}
      />
      <div className="relative">
        <Heading level={2} className="text-white [&_em]:text-accent-300">
          {resolvedHeadline}
        </Heading>
        <p className="mx-auto mt-4 max-w-xl text-body-lg text-neutral-400">{resolvedSubheadline}</p>
        <Button asChild variant="accent" size="lg" className="mt-8">
          <Link href={resolvedCtaHref}>
            {resolvedCtaLabel} <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </Reveal>
  );
}
