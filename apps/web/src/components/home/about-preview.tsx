import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Heading, Reveal } from "@agency/ui";
import type { AboutContentRead } from "@/lib/types";

export function AboutPreview({ about }: { about: AboutContentRead }) {
  return (
    <div className="grid gap-10 md:grid-cols-2 md:items-center">
      <Reveal>
        <Heading level={2}>**Design and engineering** — one discipline, not a handoff.</Heading>
        <p className="mt-5 text-body-lg text-body">{about.story}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/about">
            More about us <ArrowUpRight />
          </Link>
        </Button>
      </Reveal>
      <Reveal delay={0.1} className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-200 p-6">
          <p className="font-heading text-h2 font-semibold text-heading">{about.yearsExperience}+</p>
          <p className="mt-1 text-body-sm text-neutral-500">Years in business</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 p-6">
          <p className="font-heading text-h2 font-semibold text-heading">{about.projectsShipped}+</p>
          <p className="mt-1 text-body-sm text-neutral-500">Projects shipped</p>
        </div>
        <div className="col-span-2 rounded-2xl bg-neutral-950 p-6 text-white">
          <p className="text-body-sm text-neutral-400">Our mission</p>
          <p className="mt-1 text-body">{about.mission}</p>
        </div>
      </Reveal>
    </div>
  );
}
