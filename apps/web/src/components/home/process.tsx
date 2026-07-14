import { Heading, Reveal } from "@agency/ui";
import type { HomeProcessStepRead } from "@/lib/types";

export function Process({ steps, heading }: { steps: HomeProcessStepRead[]; heading?: string | null }) {
  if (steps.length === 0) return null;

  return (
    <div>
      <Reveal>
        <Heading level={2} className="text-center">
          {heading ?? "How we **work**"}
        </Heading>
      </Reveal>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <Reveal key={step.id} delay={i * 0.08} className="relative">
            <p className="font-mono text-label text-accent-500">0{i + 1}</p>
            <h3 className="mt-3 text-h4 font-semibold text-heading">{step.title}</h3>
            <p className="mt-2 text-body-sm text-body">{step.description}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
