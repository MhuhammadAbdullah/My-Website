"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@agency/ui";
import { adminNavGroups } from "@/lib/nav-config";
import { usePermissions } from "@/lib/use-permissions";

// Sections that get a switcher across all of their pages (the Finance screens have their own, in finance/layout.tsx).
const GROUPS_WITH_TABS = ["site", "influencers", "access"];

export function SectionTabs() {
  const pathname = usePathname();
  const { can } = usePermissions();
  const group = adminNavGroups.find((g) => GROUPS_WITH_TABS.includes(g.key) && g.items.some((i) => i.href === pathname || pathname.startsWith(`${i.href}/`)));
  if (!group) return null;
  const items = group.items.filter((i) => i.resource === null || can(i.resource, "view"));
  // Only the most specific match is active ("/influencers/applications" must not also light up "/influencers").
  const matches = items.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const activeHref = matches.sort((x, y) => y.href.length - x.href.length)[0]?.href;
  return (
    <nav aria-label={`${group.label} sections`} className="mb-6 max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
        {items.map((i) => {
          const active = i.href === activeHref;
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={cn("shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors", active ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:text-heading")}
            >
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
