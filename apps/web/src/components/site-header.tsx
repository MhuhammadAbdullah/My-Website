"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Button, cn } from "@agency/ui";
import type { NavItemRead } from "@/lib/types";
import type { ResolvedBranding } from "@/lib/branding";

export function SiteHeader({ navItems, branding }: { navItems: NavItemRead[]; branding: ResolvedBranding }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="glass flex w-full max-w-6xl items-center justify-between gap-8 rounded-full px-6 py-3">
        <Link href="/" className="flex h-14 shrink-0 items-center gap-2.5 pl-1">
          {branding.logoUrl ? (
            <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-neutral-200/60">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset */}
              <img src={branding.logoUrl} alt={branding.name} className="size-full rounded-full object-cover" />
            </span>
          ) : (
            <span className="max-w-[12rem] truncate font-heading text-body font-semibold text-heading">
              {branding.name}
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-medium transition-colors duration-fast",
                  active ? "bg-neutral-100 text-heading" : "text-body hover:text-heading",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 lg:block">
          <Button asChild size="sm">
            <Link href="/contact">
              Start a project <ArrowUpRight />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-heading lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="glass absolute left-4 right-4 top-[calc(100%+0.5rem)] flex flex-col gap-1 rounded-3xl p-3 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-2xl px-4 py-3 text-body font-medium text-heading transition-colors hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
          <Button asChild className="mt-2">
            <Link href="/contact">Start a project</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
