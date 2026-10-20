import { Check } from "lucide-react";
import { Container, Heading, Reveal, cn } from "@agency/ui";
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
              <Reveal
                key={i}
                delay={i * 0.06}
                className={cn(
                  "flex h-full flex-col rounded-[var(--radius-2xl)] border p-8",
                  hot ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-200 bg-surface",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className={cn("min-w-0 font-heading text-h4 font-extrabold", hot ? "text-on-accent" : "text-heading")}>{str(p.title)}</h3>
                  {str(p.badge) && (
                    <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6875rem] font-extrabold uppercase tracking-wide sm:px-3 sm:text-label sm:tracking-wider", hot ? "bg-[#0b0b0c] text-[color:var(--accent)]" : "border border-neutral-300 text-neutral-500")}>
                      {str(p.badge)}
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  {str(p.pricePrefix) && <p className={cn("text-body-sm", hot ? "text-on-accent/70" : "text-neutral-400")}>{str(p.pricePrefix)}</p>}
                  <p className={cn("font-heading text-[clamp(2rem,1.2rem+2.2vw,3rem)] font-extrabold leading-none tracking-[0.02em]", hot ? "text-on-accent" : "text-heading")}>
                    {str(p.price)}
                  </p>
                  {str(p.billingNote) && <p className={cn("mt-2 text-body-sm", hot ? "text-on-accent/70" : "text-neutral-400")}>{str(p.billingNote)}</p>}
                </div>

                {str(p.description) && <p className={cn("mt-5 text-body-sm", hot ? "text-on-accent/80" : "text-neutral-500")}>{str(p.description)}</p>}

                {features.length > 0 && (
                  <ul className="mt-6 space-y-3 text-body-sm">
                    {features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check className={cn("mt-0.5 size-4 shrink-0", hot ? "text-on-accent" : "text-accent-500")} aria-hidden />
                        <span className={hot ? "text-on-accent" : "text-body"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto pt-8">
                  <CmsButton button={p.button} onAccent={hot} className="w-full justify-center" />
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
