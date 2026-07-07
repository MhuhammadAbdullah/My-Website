import { Reveal } from "@agency/ui";
import type { HomeStatRead } from "@/lib/types";

export function Stats({ stats }: { stats: HomeStatRead[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-8 border-y border-neutral-200 py-12 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <Reveal key={stat.id} delay={i * 0.06} className="text-center">
          <p className="font-heading text-h2 font-semibold text-heading">
            {stat.number}
            <span className="text-accent-500">{stat.suffix}</span>
          </p>
          <p className="mt-1 text-body-sm text-neutral-500">{stat.title}</p>
          {stat.description && <p className="mt-0.5 text-body-sm text-neutral-400">{stat.description}</p>}
        </Reveal>
      ))}
    </div>
  );
}
