import type { ProjectSection } from "@/lib/types";

const MIN_SECTIONS_FOR_TOC = 8;

export function ProjectToc({ sections }: { sections: ProjectSection[] }) {
  if (sections.length < MIN_SECTIONS_FOR_TOC) return null;

  return (
    <nav aria-label="Project sections" className="rounded-2xl border border-neutral-200 p-6">
      <p className="font-mono text-label uppercase text-neutral-400">Project overview</p>
      <ul className="mt-3 space-y-2.5">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#section-${section.id}`}
              className="text-body-sm text-body transition-colors hover:text-accent-600"
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
