"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input, cn } from "@agency/ui";

export function PortfolioFilters({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const activeCategory = searchParams.get("category") ?? "";

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        updateParams({ search: search || null });
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => updateParams({ category: null })}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
            !activeCategory ? "bg-heading text-white" : "bg-neutral-100 text-body hover:bg-neutral-200",
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => updateParams({ category: category.slug })}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
              activeCategory === category.slug
                ? "bg-heading text-white"
                : "bg-neutral-100 text-body hover:bg-neutral-200",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="pl-10"
        />
      </div>
    </div>
  );
}
