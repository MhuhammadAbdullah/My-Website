import { Heading, Reveal } from "@agency/ui";

const steps = [
  { title: "Discovery", description: "We map your audience, competitors, and the outcome that actually matters." },
  { title: "Design", description: "Wireframes, then high-fidelity screens in a system built for your brand." },
  { title: "Build", description: "Type-safe, tested implementation — weekly demos against real staging data." },
  { title: "Launch & support", description: "QA, performance pass, guided handoff, and a 30-day warranty period." },
];

export function Process() {
  return (
    <div>
      <Reveal>
        <Heading level={2} className="text-center">
          How we **work**
        </Heading>
      </Reveal>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.08} className="relative">
            <p className="font-mono text-label text-accent-500">0{i + 1}</p>
            <h3 className="mt-3 text-h4 font-semibold text-heading">{step.title}</h3>
            <p className="mt-2 text-body-sm text-body">{step.description}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
