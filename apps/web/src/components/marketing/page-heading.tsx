import { Reveal, Breadcrumb, cn, type BreadcrumbItem } from "@agency/ui";

// Shared top-of-page block (breadcrumb + heading/description/actions) used by
// every top-level marketing page, so the max-width, spacing, and reveal
// animation stay in one place instead of seven copy-pasted instances.
export function PageHeading({
  breadcrumb,
  children,
  className,
}: {
  breadcrumb: BreadcrumbItem[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <Breadcrumb items={breadcrumb} />
      <Reveal className={cn("mt-6 max-w-4xl", className)}>{children}</Reveal>
    </>
  );
}
