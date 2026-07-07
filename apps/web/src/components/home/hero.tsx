import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge, Button, Heading, Reveal } from "@agency/ui";
import { cloudinaryTransform } from "@/lib/cloudinary";
import type { HomeContentRead } from "@/lib/types";

export function Hero({ content }: { content: HomeContentRead }) {
  const hasSecondaryCta = content.heroSecondaryCtaEnabled && content.heroSecondaryCtaLabel && content.heroSecondaryCtaHref;
  const backgroundUrl = content.heroBackgroundImage
    ? cloudinaryTransform(content.heroBackgroundImage.url, "f_auto,q_auto,w_1600")
    : null;

  return (
    // -mt-32/pt-44 below cancel out: pulls this wrapper's box up by exactly
    // <main>'s pt-32 (the fixed header's clearance) so the background can
    // extend behind the header on mobile/tablet, while adding the same
    // amount back as top padding keeps the actual content (badge/heading/
    // etc.) at its original position -- net zero effect on content layout or
    // the height of this section as far as later sections are concerned.
    // Reset at `lg:` (the same breakpoint the header itself switches mobile
    // nav at) so desktop keeps its original, unextended background exactly
    // as it was.
    <div className="relative -mt-32 overflow-hidden px-6 pb-section pt-44 text-center lg:mt-0 lg:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] lg:h-[36rem]"
        style={
          backgroundUrl
            ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: "radial-gradient(700px circle at 50% -10%, oklch(58% 0.19 265 / 0.12), transparent 70%)" }
        }
      />
      {content.heroBadgeText && (
        <Reveal>
          <Badge variant="accent" className="mx-auto">
            <Sparkles className="size-3.5" /> {content.heroBadgeText}
          </Badge>
        </Reveal>
      )}
      <Reveal delay={0.08}>
        <Heading level={1} display className="mx-auto mt-6 max-w-3xl [&_em]:text-accent-600">
          {content.heroHeadline.includes("**") ? content.heroHeadline : `**${content.heroHeadline}**`}
        </Heading>
      </Reveal>
      <Reveal delay={0.16}>
        <p className="mx-auto mt-6 max-w-xl text-body-lg text-body">{content.heroSubheadline}</p>
      </Reveal>
      {content.heroDescription && (
        <Reveal delay={0.2}>
          <p className="mx-auto mt-3 max-w-xl text-body text-neutral-500">{content.heroDescription}</p>
        </Reveal>
      )}
      <Reveal delay={0.24} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href={content.heroCtaHref} target={content.heroCtaNewTab ? "_blank" : undefined} rel={content.heroCtaNewTab ? "noreferrer" : undefined}>
            {content.heroCtaLabel} <ArrowUpRight />
          </Link>
        </Button>
        {hasSecondaryCta && (
          <Button asChild size="lg" variant="outline">
            <Link
              href={content.heroSecondaryCtaHref!}
              target={content.heroSecondaryCtaNewTab ? "_blank" : undefined}
              rel={content.heroSecondaryCtaNewTab ? "noreferrer" : undefined}
            >
              {content.heroSecondaryCtaLabel}
            </Link>
          </Button>
        )}
      </Reveal>
    </div>
  );
}
