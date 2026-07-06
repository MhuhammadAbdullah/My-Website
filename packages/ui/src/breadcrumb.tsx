import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "./lib/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-body-sm text-neutral-500", className)}>
      <ol className="flex items-center gap-2">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <a href={item.href} className="transition-colors hover:text-heading">
                  {item.label}
                </a>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-heading" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="size-3.5 text-neutral-300" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
