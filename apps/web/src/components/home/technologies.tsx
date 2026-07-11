import { Heading, Reveal } from "@agency/ui";
import type { TechnologyRead } from "@/lib/types";
import { TechMarquee } from "@/components/marketing/tech-marquee";

export function Technologies({
  technologies,
  displayStyle = "TAGS",
}: {
  technologies: TechnologyRead[];
  displayStyle?: "TAGS" | "MARQUEE";
}) {
  return (
    <div className="text-center">
      <Reveal>
        <Heading level={2}>The **stack** behind the work</Heading>
      </Reveal>
      {displayStyle === "MARQUEE" ? (
        <Reveal delay={0.1} className="mt-10">
          <TechMarquee technologies={technologies} />
        </Reveal>
      ) : (
        <Reveal delay={0.1} className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3">
          {technologies.map((tech) => (
            <span
              key={tech.id}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 font-mono text-body-sm text-body"
            >
              {tech.name}
            </span>
          ))}
        </Reveal>
      )}
    </div>
  );
}
