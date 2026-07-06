import * as React from "react";
import { cn } from "./lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded-lg", className)} aria-hidden="true" {...props} />;
}

/** Generic page skeleton: hero block + N section blocks, mirroring the
 * container/section rhythm every marketing page shares. */
export function PageSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-section" role="status" aria-label="Loading page">
      <Skeleton className="mx-auto h-12 w-2/3 max-w-xl" />
      <Skeleton className="mx-auto mt-4 h-5 w-1/2 max-w-md" />
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: sections * 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
