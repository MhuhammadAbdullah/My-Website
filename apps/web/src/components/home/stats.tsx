import { Reveal } from "@agency/ui";
import type { HomeContentRead } from "@/lib/types";

export function Stats({ stats }: { stats: HomeContentRead["stats"] }) {
  return (
    <div className="grid grid-cols-2 gap-8 border-y border-neutral-200 py-12 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <Reveal key={stat.label} delay={i * 0.06} className="text-center">
          <p className="font-heading text-h2 font-semibold text-heading">
            {stat.value}
            <span className="text-accent-500">{stat.suffix}</span>
          </p>
          <p className="mt-1 text-body-sm text-neutral-500">{stat.label}</p>
        </Reveal>
      ))}
    </div>
  );
}
