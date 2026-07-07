import type { ComponentType } from "react";
import * as Icons from "lucide-react";
import { Sparkles } from "lucide-react";
import { Heading, Reveal } from "@agency/ui";
import type { HomeWhyReasonRead } from "@/lib/types";

// Icon is stored as a lucide-react icon name string (chosen via the admin's
// icon picker), so it's resolved dynamically here rather than through a fixed
// map -- falls back to a generic icon if a name doesn't match (e.g. was
// renamed/removed from a future lucide-react version).
function resolveIcon(name: string): ComponentType<{ className?: string }> {
  const icon = (Icons as unknown as Record<string, ComponentType<{ className?: string }> | undefined>)[name];
  return icon ?? Sparkles;
}

export function WhyWorkWithMe({ reasons }: { reasons: HomeWhyReasonRead[] }) {
  if (reasons.length === 0) return null;

  return (
    <div>
      <Reveal>
        <Heading level={2} className="text-center">
          Why work with **us**
        </Heading>
      </Reveal>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {reasons.map((reason, i) => {
          const Icon = resolveIcon(reason.icon);
          return (
            <Reveal key={reason.id} delay={i * 0.06} className="flex gap-4 rounded-2xl border border-neutral-200 p-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-h4 font-semibold text-heading">{reason.title}</h3>
                <p className="mt-1.5 text-body-sm text-body">{reason.description}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
