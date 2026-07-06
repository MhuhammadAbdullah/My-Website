import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge, Button, Heading, Reveal } from "@agency/ui";
import type { HomeContentRead } from "@/lib/types";

export function Hero({ content }: { content: HomeContentRead }) {
  return (
    <div className="relative overflow-hidden px-6 pb-section pt-12 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
        style={{
          background: "radial-gradient(700px circle at 50% -10%, oklch(58% 0.19 265 / 0.12), transparent 70%)",
        }}
      />
      <Reveal>
        <Badge variant="accent" className="mx-auto">
          <Sparkles className="size-3.5" /> Now booking Q3 projects
        </Badge>
      </Reveal>
      <Reveal delay={0.08}>
        <Heading level={1} display className="mx-auto mt-6 max-w-3xl [&_em]:text-accent-600">
          {content.heroHeadline.includes("**")
            ? content.heroHeadline
            : `**${content.heroHeadline}**`}
        </Heading>
      </Reveal>
      <Reveal delay={0.16}>
        <p className="mx-auto mt-6 max-w-xl text-body-lg text-body">{content.heroSubheadline}</p>
      </Reveal>
      <Reveal delay={0.24} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href={content.heroCtaHref}>
            {content.heroCtaLabel} <ArrowUpRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/portfolio">View our work</Link>
        </Button>
      </Reveal>
    </div>
  );
}
