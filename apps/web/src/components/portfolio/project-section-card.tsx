import { Card, CardContent, CardHeader, CardTitle, DynamicIcon, RichText, normalizeIconName } from "@agency/ui";
import type { ProjectSection } from "@/lib/types";

export function ProjectSectionCard({ section }: { section: ProjectSection }) {
  const hasIcon = normalizeIconName(section.icon) !== null;

  return (
    <Card id={`section-${section.id}`} className="scroll-mt-28 hover:-translate-y-0.5">
      <CardHeader className="flex-row items-center gap-3 pb-0">
        {hasIcon && (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <DynamicIcon name={section.icon} size={20} />
          </div>
        )}
        <CardTitle>{section.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <RichText html={section.content} className="mt-4" />
      </CardContent>
    </Card>
  );
}
