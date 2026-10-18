import { Container, DynamicIcon, Heading, Reveal } from "@agency/ui";
import { arr, str, type Content } from "./types";

// Horizontal on desktop (up to 4 across, wrapping beyond), stacked on mobile.
export function ProcessSection({ content }: { content: Content }) {
  const eyebrow = str(content.eyebrow);
  const heading = str(content.heading);
  const steps = arr<{ number?: string; title?: string; description?: string; meta?: string; icon?: string }>(content.steps).filter((s) => str(s.title));
  if (steps.length === 0) return null;

  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        {(eyebrow || heading) && (
          <Reveal className="mb-12">
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            {heading && <Heading level={2}>{heading}</Heading>}
          </Reveal>
        )}
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={i}>
              <Reveal delay={i * 0.06} className="flex h-full flex-col rounded-[var(--radius-xl)] border border-neutral-200 bg-surface p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent-500 text-body-sm font-extrabold text-on-accent">
                    {str(s.icon) ? <DynamicIcon name={str(s.icon)} size={18} /> : str(s.number) || String(i + 1)}
                  </span>
                  {str(s.meta) && <span className="text-body-sm text-neutral-400">{str(s.meta)}</span>}
                </div>
                <h3 className="mt-8 font-heading text-h4 font-extrabold text-heading">{str(s.title)}</h3>
                {str(s.description) && <p className="mt-2 text-body-sm text-neutral-500">{str(s.description)}</p>}
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
