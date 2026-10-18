import { Container, Heading, Reveal, cn } from "@agency/ui";
import { CountUp } from "./count-up";
import { arr, str, type Content } from "./types";

// Big-number block. `grid` (default) is the bordered 4-up stat grid; `band`
// is the full accent-coloured band.
export function ResultsSection({ content }: { content: Content }) {
  const items = arr<{ value?: string; label?: string; note?: string }>(content.items).filter((i) => str(i.value) && str(i.label));
  if (items.length === 0) return null;

  const heading = str(content.heading);
  const band = content.variant === "band";
  const countUp = content.countUp === true;

  const cells = items.map((item, i) => (
    <div key={i} className={cn("p-6 sm:p-8", band ? "" : "bg-surface")}>
      <p className={cn("font-heading text-[clamp(2.25rem,1.2rem+3.6vw,4.25rem)] font-extrabold leading-none tracking-[0.02em]", band ? "text-on-accent" : "text-heading")}>
        <CountUp value={str(item.value)} enabled={countUp} />
      </p>
      <p className={cn("mt-4 text-body-sm font-semibold", band ? "text-on-accent" : "text-neutral-500")}>{str(item.label)}</p>
      {str(item.note) && <p className={cn("mt-1 text-body-sm", band ? "text-on-accent/70" : "text-neutral-400")}>{str(item.note)}</p>}
    </div>
  ));

  return (
    <section className={band ? "on-accent bg-accent-500 py-[var(--spacing-section)] text-on-accent" : "py-[calc(var(--spacing-section)/1.5)]"}>
      <Container>
        {heading && (
          <Reveal className="mb-10">
            <Heading level={2} className={band ? "!text-[#0b0b0c]" : ""}>
              {heading}
            </Heading>
          </Reveal>
        )}
        <Reveal>
          <div
            className={cn(
              "grid grid-cols-2 overflow-hidden rounded-[var(--radius-2xl)] lg:grid-cols-4",
              band ? "gap-y-4" : "gap-px border border-neutral-200 bg-neutral-200",
            )}
          >
            {cells}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
