import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Heading, Reveal } from "@agency/ui";
import type { AboutContentRead, HomeContentRead, HomeStatRead } from "@/lib/types";

export function AboutPreview({
  about,
  home,
  stats,
}: {
  about: AboutContentRead;
  home: HomeContentRead;
  stats: HomeStatRead[];
}) {
  const yearsInBusiness = stats.find((s) => s.highlightKey === "YEARS_IN_BUSINESS");
  const projectsShipped = stats.find((s) => s.highlightKey === "PROJECTS_SHIPPED");

  return (
    <div className="grid gap-10 md:grid-cols-2 md:items-center">
      <Reveal>
        <Heading level={2}>{home.storyHeading ?? "**Design and engineering** — one discipline, not a handoff."}</Heading>
        <p className="mt-5 text-body-lg text-body">{about.story}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/about">
            {home.storyButtonLabel ?? "More about us"} <ArrowUpRight />
          </Link>
        </Button>
      </Reveal>
      <Reveal delay={0.1} className="grid grid-cols-2 gap-4">
        {yearsInBusiness && (
          <div className="rounded-2xl border border-neutral-200 p-6">
            <p className="font-heading text-h2 font-semibold text-heading">
              {yearsInBusiness.number}
              {yearsInBusiness.suffix}
            </p>
            <p className="mt-1 text-body-sm text-neutral-500">{yearsInBusiness.title}</p>
          </div>
        )}
        {projectsShipped && (
          <div className="rounded-2xl border border-neutral-200 p-6">
            <p className="font-heading text-h2 font-semibold text-heading">
              {projectsShipped.number}
              {projectsShipped.suffix}
            </p>
            <p className="mt-1 text-body-sm text-neutral-500">{projectsShipped.title}</p>
          </div>
        )}
        <div className="col-span-2 rounded-2xl bg-neutral-950 p-6 text-white">
          <p className="text-body-sm text-neutral-400">{home.storyMissionLabel ?? "Our mission"}</p>
          <p className="mt-1 text-body">{about.mission}</p>
        </div>
      </Reveal>
    </div>
  );
}
