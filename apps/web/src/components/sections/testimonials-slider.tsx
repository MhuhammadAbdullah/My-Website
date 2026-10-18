"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { Container, Heading, cn } from "@agency/ui";
import { cloudinaryTransform } from "@/lib/cloudinary";

export interface SliderTestimonial {
  id: string;
  quote: string;
  author: string;
  role?: string | null;
  company?: string | null;
  avatar?: { url: string; alt: string } | null;
}

// The card keeps one fixed size: every testimonial is laid out in the same grid
// cell, so the card is as tall as the longest one, and only the content fades /
// slides between them. Arrows, swipe, optional autoplay (paused on hover/focus,
// off for prefers-reduced-motion). All slides are real DOM, so crawlers and
// no-JS visitors still get the text.
export function TestimonialsSlider({
  eyebrow,
  heading,
  items,
  autoplay,
  intervalSeconds,
}: {
  eyebrow: string;
  heading: string;
  items: SliderTestimonial[];
  autoplay: boolean;
  intervalSeconds: number;
}) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const touchX = React.useRef<number | null>(null);
  const count = items.length;
  const go = React.useCallback((dir: 1 | -1) => setIndex((i) => (i + dir + count) % count), [count]);

  React.useEffect(() => {
    if (!autoplay || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(1), Math.max(3, intervalSeconds) * 1000);
    return () => clearInterval(t);
  }, [autoplay, paused, count, intervalSeconds, go]);

  const active = Math.min(index, count - 1);

  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        {(eyebrow || heading) && (
          <div className="mb-10">
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            {heading && <Heading level={2}>{heading}</Heading>}
          </div>
        )}
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="Testimonials"
          className="rounded-[var(--radius-2xl)] border border-neutral-200 bg-surface p-6 sm:p-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touchX.current;
            touchX.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (start == null || end == null || Math.abs(end - start) < 50) return;
            go(end < start ? 1 : -1);
          }}
        >
          <Quote className="size-8 text-accent-500" aria-hidden />

          {/* every slide shares one grid cell => fixed card height */}
          <div className="mt-5 grid" aria-live={autoplay && !paused ? "off" : "polite"}>
            {items.map((t, i) => {
              const on = i === active;
              const byline = [t.role, t.company].filter(Boolean).join(", ");
              return (
                <figure
                  key={t.id}
                  aria-hidden={!on}
                  className={cn(
                    "col-start-1 row-start-1 flex flex-col justify-between gap-8 transition-all duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none",
                    on ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0",
                  )}
                >
                  <blockquote className="max-w-4xl font-body text-[clamp(1rem,0.9rem+0.55vw,1.3125rem)] font-medium leading-relaxed text-heading">{t.quote}</blockquote>
                  <figcaption className="flex items-center gap-4">
                    {t.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                      <img src={cloudinaryTransform(t.avatar.url, "f_auto,q_auto,c_fill,w_96,h_96")} alt={t.avatar.alt || ""} loading="lazy" className="size-11 rounded-full object-cover" />
                    ) : (
                      <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-neutral-100 font-heading font-extrabold text-heading">
                        {t.author.charAt(0)}
                      </span>
                    )}
                    <div>
                      <p className="font-bold text-heading">{t.author}</p>
                      {byline && <p className="text-body-sm text-neutral-500">{byline}</p>}
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          {count > 1 && (
            <div className="mt-6 flex items-center justify-end gap-3">
              <span className="mr-2 text-body-sm text-neutral-400" aria-hidden>
                {active + 1} / {count}
              </span>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous testimonial"
                className="flex size-10 items-center justify-center rounded-full border border-neutral-300 text-heading transition-colors hover:border-accent-500 hover:text-accent-500"
              >
                <ArrowLeft className="size-5" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next testimonial" className="flex size-10 items-center justify-center rounded-full bg-accent-500 text-on-accent transition-opacity hover:opacity-90">
                <ArrowRight className="size-5" />
              </button>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
