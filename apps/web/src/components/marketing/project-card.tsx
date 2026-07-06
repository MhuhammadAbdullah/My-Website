import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, Badge } from "@agency/ui";
import type { ProjectListItem } from "@/lib/types";

export function ProjectCard({ project }: { project: ProjectListItem }) {
  const cover = project.gallery[0];

  return (
    <Link href={`/portfolio/${project.slug}`}>
      <Card className="h-full overflow-hidden p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
          {cover && (
            <Image
              src={cover.url}
              alt={cover.caption ?? project.title}
              fill
              className="object-cover transition-transform duration-slow ease-[var(--ease-premium)] group-hover:scale-105"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          )}
          {project.category && (
            <Badge variant="dark" className="absolute left-4 top-4">
              {project.category.name}
            </Badge>
          )}
        </div>
        <div className="p-6">
          <h3 className="flex items-center justify-between gap-2 text-h4 font-semibold text-heading">
            {project.title}
            <ArrowUpRight className="size-4 shrink-0 text-neutral-300 transition-transform duration-base group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-500" />
          </h3>
          <p className="mt-2 text-body-sm text-body">{project.summary}</p>
        </div>
      </Card>
    </Link>
  );
}
