import { DynamicIcon, Heading, Reveal } from "@agency/ui";
import type { HomeWhyReasonRead } from "@/lib/types";

export function WhyWorkWithMe({ reasons, heading }: { reasons: HomeWhyReasonRead[]; heading?: string | null }) {
  if (reasons.length === 0) return null;

  return (
    <div>
      <Reveal>
        <Heading level={2} className="text-center">
          {heading ?? "Why work with **us**"}
        </Heading>
      </Reveal>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {reasons.map((reason, i) => (
          <Reveal key={reason.id} delay={i * 0.06} className="flex gap-4 rounded-2xl border border-neutral-200 p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
              <DynamicIcon name={reason.icon} size={20} fallback="sparkles" />
            </div>
            <div>
              <h3 className="text-h4 font-semibold text-heading">{reason.title}</h3>
              <p className="mt-1.5 text-body-sm text-body">{reason.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
