import { Check } from "lucide-react";
import { Container, Heading, Reveal, cn } from "@agency/ui";
import type { ReactNode } from "react";
import { CmsButton } from "./cms-button";
import { arr, str, type ButtonValue, type Content } from "./types";

interface Pkg {
  title: string;
  pricePrefix?: string;
  price?: string;
  billingNote?: string;
  description?: string;
  features?: (string | { text?: string })[];
  highlighted?: boolean;
  badge?: string;
  button?: ButtonValue;
}

export interface PricingPackageCardProps {
  title: string;
  pricePrefix?: string;
  price: ReactNode;
  billingNote?: string;
  description?: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  action?: ReactNode;
}

/** Shared package card used by the home page and service detail pages. */
export function PricingPackageCard({ card: p, index = 0 }: { card: PricingPackageCardProps; index?: number }) {
  const hot = !!p.highlighted;
  return (
    <Reveal
      delay={index * 0.06}
      className={cn(
        "flex h-full flex-col rounded-[var(--radius-2xl)] border p-8",
        hot ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-200 bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn("min-w-0 font-heading text-h4 font-extrabold", hot ? "text-on-accent" : "text-heading")}>{p.title}</h3>
        {p.badge && (
          <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6875rem] font-extrabold uppercase tracking-wide sm:px-3 sm:text-label sm:tracking-wider", hot ? "bg-[#0b0b0c] text-[color:var(--accent)]" : "border border-neutral-300 text-neutral-500")}>
            {p.badge}
          </span>
        )}
      </div>

      <div className="mt-6">
        {p.pricePrefix && <p className={cn("text-body-sm", hot ? "text-on-accent/70" : "text-neutral-400")}>{p.pricePrefix}</p>}
        <div className={cn("font-heading text-[clamp(2rem,1.2rem+2.2vw,3rem)] font-extrabold leading-none tracking-[0.02em]", hot ? "text-on-accent" : "text-heading")}>
          {p.price}
        </div>
        {p.billingNote && <p className={cn("mt-2 text-body-sm", hot ? "text-on-accent/70" : "text-neutral-400")}>{p.billingNote}</p>}
      </div>

      {p.description && <p className={cn("mt-5 text-body-sm", hot ? "text-on-accent/80" : "text-neutral-500")}>{p.description}</p>}

      {p.features.length > 0 && (
        <ul className="mt-6 space-y-3 text-body-sm">
          {p.features.map((feature, i) => (
            <li key={`${i}-${feature}`} className="flex items-start gap-3">
              <Check className={cn("mt-0.5 size-4 shrink-0", hot ? "text-on-accent" : "text-accent-500")} aria-hidden />
              <span className={hot ? "text-on-accent" : "text-body"}>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {p.action && <div className="mt-auto pt-8">{p.action}</div>}
    </Reveal>
  );
}

// Cards come from the "Packages" collection (Admin > Collections > Packages).
// The highlighted one is the accent-coloured card.
export function PricingSection({ content }: { content: Content }) {
  const eyebrow = str(content.eyebrow);
  const heading = str(content.heading);
  const intro = str(content.intro);
  const packages = arr<Pkg>(content.packages).filter((p) => str(p.title));
  if (packages.length === 0) return null;

  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        {(eyebrow || heading || intro) && (
          <Reveal className="mx-auto mb-14 max-w-5xl text-center">
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            {heading && <Heading level={2} className="md:whitespace-nowrap">{heading}</Heading>}
            {intro && <p className="mx-auto mt-5 max-w-2xl text-body-lg text-neutral-500">{intro}</p>}
          </Reveal>
        )}
        <div className="grid gap-5 lg:grid-cols-3">
          {packages.map((p, i) => {
            const hot = !!p.highlighted;
            const features = arr<string | { text?: string }>(p.features)
              .map((f) => (typeof f === "string" ? f : str(f.text)))
              .filter(Boolean);
            return (
              <PricingPackageCard
                key={i}
                index={i}
                card={{
                  title: str(p.title),
                  pricePrefix: str(p.pricePrefix),
                  price: str(p.price),
                  billingNote: str(p.billingNote),
                  description: str(p.description),
                  features,
                  highlighted: hot,
                  badge: str(p.badge),
                  action: <CmsButton button={p.button} onAccent={hot} className="w-full justify-center" />,
                }}
              />
            );
          })}
        </div>
      </Container>
    </section>
  );
}
