import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Heading, Reveal } from "@agency/ui";

export function CtaSection({
  headline = "Ready to build something **inevitable**?",
  subheadline = "Tell us about your project — most people hear back from us within one business day.",
  ctaLabel = "Start a project",
  ctaHref = "/contact",
}: {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
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
          {headline}
        </Heading>
        <p className="mx-auto mt-4 max-w-xl text-body-lg text-neutral-400">{subheadline}</p>
        <Button asChild variant="accent" size="lg" className="mt-8">
          <Link href={ctaHref}>
            {ctaLabel} <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </Reveal>
  );
}
