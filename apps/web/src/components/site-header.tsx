"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button, cn } from "@agency/ui";
import type { NavItemRead, SiteSettings } from "@/lib/types";
import type { ResolvedBranding } from "@/lib/branding";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SiteHeader({
  navItems,
  branding,
  header,
  hasAnnouncement = false,
}: {
  navItems: NavItemRead[];
  branding: ResolvedBranding;
  header: SiteSettings["header"];
  hasAnnouncement?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const cta = header?.ctaVisible && header.ctaLabel && header.ctaHref ? header : null;

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Mobile menu = modal dialog: focus moves in, Tab/Shift+Tab are trapped,
  // Escape closes, focus returns to the toggle, and the page behind can't scroll.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const panel = panelRef.current;
    const toggle = toggleRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    focusables()[0]?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = [toggle, ...focusables()].filter((el): el is HTMLElement => !!el);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      (previouslyFocused && document.contains(previouslyFocused) ? previouslyFocused : toggle)?.focus();
    };
  }, [mobileOpen]);

  const linkProps = (item: { href: string; newTab?: boolean }) =>
    item.newTab ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};

  return (
    <header className={cn("fixed inset-x-0 z-50 px-4", hasAnnouncement ? "top-12" : "top-4")}>
      <div className="glass mx-auto flex w-full max-w-[var(--layout-max)] items-center justify-between gap-6 rounded-full py-2 pl-6 pr-2">
        <Link href="/" className="flex h-11 shrink-0 items-center gap-2.5" aria-label={`${branding.name || "Home"} — home`}>
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset
            <img src={branding.logoUrl} alt={branding.name} className="h-full max-h-9 w-auto object-contain" />
          ) : (
            <span className="max-w-[12rem] truncate font-heading text-h4 font-extrabold tracking-tight text-heading">{branding.name}</span>
          )}
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                {...linkProps({ href: item.href, newTab: item.openInNewTab })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-semibold transition-colors duration-fast",
                  active ? "text-accent-500" : "text-body hover:text-heading",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {cta && (
            <Button asChild size="sm" withArrow className="hidden lg:inline-flex">
              <Link href={cta.ctaHref} {...linkProps({ href: cta.ctaHref, newTab: cta.ctaNewTab })}>
                {cta.ctaLabel}
              </Link>
            </Button>
          )}
          <button
            ref={toggleRef}
            type="button"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-heading hover:bg-neutral-100 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="glass mx-auto mt-2 flex max-h-[calc(100dvh-6rem)] w-full max-w-[var(--layout-max)] flex-col gap-1 overflow-y-auto rounded-3xl p-3 lg:hidden"
        >
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              {...linkProps({ href: item.href, newTab: item.openInNewTab })}
              aria-current={pathname === item.href ? "page" : undefined}
              className="rounded-2xl px-4 py-3 text-body font-semibold text-heading transition-colors hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
          {cta && (
            <Button asChild withArrow className="mt-2">
              <Link href={cta.ctaHref} {...linkProps({ href: cta.ctaHref, newTab: cta.ctaNewTab })}>
                {cta.ctaLabel}
              </Link>
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
