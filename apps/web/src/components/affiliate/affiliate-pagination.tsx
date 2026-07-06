"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from "@agency/ui";
import { PortfolioPagination } from "@/components/portfolio/portfolio-pagination";

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

export function AffiliatePagination({
  page,
  pageSize,
  total,
  totalPages,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPageSize(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-body-sm text-neutral-500">
        Showing {rangeStart}–{rangeEnd} of {total} tools
      </p>

      {/* The exact same shared pagination component used on the Portfolio
          page — not a re-implementation, imported directly. */}
      <PortfolioPagination page={page} totalPages={totalPages} />

      <div className="flex items-center gap-2">
        <Label className="mb-0 whitespace-nowrap text-body-sm text-neutral-500">Results per page:</Label>
        <Select value={String(pageSize)} onValueChange={setPageSize}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
