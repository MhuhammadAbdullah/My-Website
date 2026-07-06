"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@agency/ui";
import { adminNavGroups } from "@/lib/nav-config";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-background p-4 md:flex md:flex-col">
      <div className="px-2 py-3">
        <p className="font-heading text-body font-semibold text-heading">Calibre Digital</p>
        <p className="text-body-sm text-neutral-400">Admin panel</p>
      </div>

      <nav className="mt-4 flex-1 space-y-6 overflow-y-auto">
        {adminNavGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 font-mono text-label uppercase tracking-wide text-neutral-400">{group.label}</p>
            <div className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-body-sm font-medium transition-colors",
                      active ? "bg-neutral-100 text-heading" : "text-body hover:bg-neutral-50 hover:text-heading",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
