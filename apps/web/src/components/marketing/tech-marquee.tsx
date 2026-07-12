import Image from "next/image";
import type { TechnologyRead } from "@/lib/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function TechMarqueeItem({ tech, hidden }: { tech: TechnologyRead; hidden: boolean }) {
  return (
    <div aria-hidden={hidden} className="flex h-44 w-50 shrink-0 items-center justify-center px-6">
      {tech.logo ? (
        // Fixed height (not width) is what keeps every logo reading as the
        // same visual size regardless of its natural aspect ratio -- a
        // square icon and a wide logotype both scale to fill this same
        // height, object-contain, so neither dominates or shrinks away.
        <div className="relative h-14 w-full grayscale opacity-70 transition-all duration-base ease-[var(--ease-premium)] hover:opacity-100 hover:grayscale-0">
          <Image src={tech.logo.url} alt={tech.name} fill sizes="160px" className="object-contain" />
        </div>
      ) : (
        <span className="font-mono text-h4 text-neutral-400 transition-colors duration-base ease-[var(--ease-premium)] hover:text-body">
          {initials(tech.name)}
        </span>
      )}
    </div>
  );
}

// Duplicating the list once and translating the track by exactly -50% is the
// standard CSS-only seamless-loop technique -- the boundary between the two
// copies is indistinguishable from the gap between any other two items, so
// the reset never reads as a jump. All items (real + duplicate) are direct
// flex children with uniform gaps, which keeps that 50% split exact.
export function TechMarquee({ technologies }: { technologies: TechnologyRead[] }) {
  if (technologies.length === 0) return null;
  const doubled = [...technologies, ...technologies];

  return (
    <div
      className="overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div className="tech-marquee-track flex w-max items-center gap-2">
        {doubled.map((tech, i) => (
          <TechMarqueeItem key={`${tech.id}-${i}`} tech={tech} hidden={i >= technologies.length} />
        ))}
      </div>
    </div>
  );
}
