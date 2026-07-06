import { Gem, MessageSquareWarning, Target, Handshake } from "lucide-react";
import { Heading, Reveal } from "@agency/ui";

const icons = { Gem, MessageSquareWarning, Target, Handshake } as const;

const reasons = [
  { title: "Craft over speed", description: "We'd rather ship a week later than ship something we're not proud of.", icon: "Gem" },
  { title: "Say the hard thing early", description: "If your idea has a flaw, you'll hear it in week one, not week ten.", icon: "MessageSquareWarning" },
  { title: "Own the outcome", description: "We measure success by your metrics, not our deliverables checklist.", icon: "Target" },
  { title: "Build for handoff", description: "Every project ends with you fully able to run without us.", icon: "Handshake" },
] satisfies { title: string; description: string; icon: keyof typeof icons }[];

export function WhyWorkWithMe() {
  return (
    <div>
      <Reveal>
        <Heading level={2} className="text-center">
          Why work with **us**
        </Heading>
      </Reveal>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {reasons.map((reason, i) => {
          const Icon = icons[reason.icon];
          return (
            <Reveal
              key={reason.title}
              delay={i * 0.06}
              className="flex gap-4 rounded-2xl border border-neutral-200 p-6"
            >
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
