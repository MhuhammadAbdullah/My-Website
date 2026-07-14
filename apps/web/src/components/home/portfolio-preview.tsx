import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Heading, Reveal } from "@agency/ui";
import { ProjectCard } from "@/components/marketing/project-card";
import type { HomeContentRead, ProjectListItem } from "@/lib/types";

export function PortfolioPreview({ projects, home }: { projects: ProjectListItem[]; home: HomeContentRead }) {
  return (
    <div>
      <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Heading level={2}>{home.portfolioHeading ?? "Recent **work**"}</Heading>
          <p className="mt-3 max-w-lg text-body-lg text-body">
            {home.portfolioDescription ??
              "A handful of the products we've designed, built, and shipped to production."}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/portfolio">
            {home.portfolioButtonLabel ?? "Full portfolio"} <ArrowUpRight />
          </Link>
        </Button>
      </Reveal>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.slice(0, 3).map((project, i) => (
          <Reveal key={project.id} delay={i * 0.08}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
