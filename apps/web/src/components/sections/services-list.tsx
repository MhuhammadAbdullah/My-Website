import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container, Heading, Reveal } from "@agency/ui";
import { getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { currencySymbol, formatAmount } from "@/lib/currency";
import { CmsButton } from "./cms-button";
import { arr, str, type ButtonValue, type Content } from "./types";

interface ServiceItem {
  id: string;
  title: string;
  slug: string;
  tagline?: string;
  priceFrom?: { amount: number; currency: string | null } | null;
}

// Numbered rows pulled from the Services collection, so this list can never
// drift from the Services page.
export async function ServicesListSection({ content }: { content: Content }) {
  const eyebrow = str(content.eyebrow);
  const heading = str(content.heading);
  const intro = str(content.intro);
  const showPrices = content.showPrices !== false;
  const pricePrefix = str(content.pricePrefix);
  const services = arr<ServiceItem>(content.services).filter((s) => str(s.title));
  if (services.length === 0) return null;

  const settings = showPrices ? await withFallback(getSettings(), {}, "settings") : {};
  const siteCurrency = settings.currency ?? "";

  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        {(heading || intro || eyebrow) && (
          <Reveal className="mb-12 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
              {heading && <Heading level={2}>{heading}</Heading>}
            </div>
            {intro && <p className="text-body text-neutral-500 md:max-w-sm md:justify-self-end">{intro}</p>}
          </Reveal>
        )}

        <ul className="border-t border-neutral-200">
          {services.map((s, i) => {
            const currency = s.priceFrom?.currency || siteCurrency;
            return (
              <li key={s.id} className="border-b border-neutral-200">
                <Link
                  href={`/services/${s.slug}`}
                  className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-2 py-6 transition-colors hover:bg-surface md:grid-cols-[3rem_1.2fr_1.6fr_8rem_3rem] md:gap-x-6 md:px-4"
                >
                  <span className="font-mono text-body-sm text-neutral-400">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 font-heading text-[clamp(1.125rem,0.9rem+0.9vw,1.75rem)] leading-tight font-extrabold text-heading transition-colors group-hover:text-accent-500">{s.title}</span>
                  <span className="order-last col-span-3 min-w-0 text-body-sm text-neutral-500 md:order-none md:col-span-1">{s.tagline}</span>
                  <span className="hidden text-right text-body-sm text-neutral-400 md:block">
                    {showPrices && s.priceFrom && currency ? (
                      <>
                        {pricePrefix && `${pricePrefix} `}
                        <span className="currency-symbol">{currencySymbol(currency)}</span>
                        {formatAmount(s.priceFrom.amount)}
                      </>
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className="flex size-11 items-center justify-center justify-self-end rounded-full border border-neutral-300 text-heading transition-colors group-hover:border-accent-500 group-hover:bg-accent-500 group-hover:text-on-accent"
                  >
                    <ArrowUpRight className="size-5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-10">
          <CmsButton button={content.button as ButtonValue | undefined} size="md" />
        </div>
      </Container>
    </section>
  );
}
