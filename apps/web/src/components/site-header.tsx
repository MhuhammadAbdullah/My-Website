"use client";

import * as React from "react";
import { ModeToggle } from "@/components/mode-toggle";
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
  const [closing, setClosing] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  // Close = play the slide-out, then unmount (so it is as smooth as opening).
  const closeMenu = React.useCallback(() => {
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMobileOpen(false);
      setClosing(false);
    }, 260);
  }, []);
  React.useEffect(() => () => clearTimeout(closeTimer.current), []);
  const closeRef = React.useRef(closeMenu);
  closeRef.current = closeMenu;
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const cta = header?.ctaVisible && header.ctaLabel && header.ctaHref ? header : null;

  // after navigating, slide the drawer out (not an abrupt disappearance)
  const openRef = React.useRef(false);
  openRef.current = mobileOpen;
  React.useEffect(() => {
    if (openRef.current) closeRef.current();
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
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
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
    <>
    <header className={cn("fixed inset-x-0 z-50 border-b border-neutral-200 bg-background/85 backdrop-blur-xl", hasAnnouncement ? "top-12" : "top-0")}>
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[var(--layout-max)] items-center justify-between gap-6 px-[var(--layout-pad)]">
        <Link href="/" className="group flex h-11 shrink-0 items-center gap-2.5" aria-label={`${branding.name || "Home"} — home`}>
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset
            <img src={branding.logoUrl} alt={branding.name} className="brand-logo h-full max-h-9 w-auto object-contain" />
          ) : (
            <span className="whitespace-nowrap font-heading text-[1.05rem] font-extrabold uppercase tracking-[0.04em] text-heading transition-colors duration-200 group-hover:text-[var(--accent)] group-focus-visible:text-[var(--accent)] sm:text-[1.2rem]">
              {branding.name}
              <span className="text-accent-500">.</span>
            </span>
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
          <ModeToggle />
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
            onClick={() => (mobileOpen ? closeMenu() : setMobileOpen(true))}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
    </header>

    {mobileOpen && (
      <div className="fixed inset-0 z-[70] lg:hidden">
        {/* dimmed page behind the drawer; tapping it closes the menu */}
        <button type="button" tabIndex={-1} aria-label="Close menu" onClick={() => closeMenu()} className={cn("absolute inset-0 bg-black/55 backdrop-blur-[2px] motion-reduce:animate-none", closing ? "animate-[overlay-out_0.26s_ease-in_forwards]" : "animate-[overlay-in_0.3s_ease-out]")} />
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn("absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col border-r border-neutral-200 bg-background shadow-soft-xl motion-reduce:animate-none", closing ? "animate-[drawer-out_0.26s_cubic-bezier(0.4,0,1,1)_forwards]" : "animate-[drawer-in_0.34s_cubic-bezier(0.22,1,0.36,1)]")}
        >
          <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-neutral-200 px-5">
            <Link href="/" onClick={() => closeMenu()} className="flex items-center" aria-label={`${branding.name || "Home"} — home`}>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset
                <img src={branding.logoUrl} alt={branding.name} className="brand-logo h-full max-h-9 w-auto object-contain" />
              ) : (
                <span className="whitespace-nowrap font-heading text-[1.05rem] font-extrabold uppercase tracking-[0.04em] text-heading">
                  {branding.name}
                  <span className="text-accent-500">.</span>
                </span>
              )}
            </Link>
            <button type="button" onClick={() => closeMenu()} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-full text-heading hover:bg-neutral-100">
              <X className="size-5" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  {...linkProps({ href: item.href, newTab: item.openInNewTab })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3.5 text-body-lg font-semibold transition-colors",
                    active ? "bg-accent-500 text-on-accent" : "text-heading hover:bg-neutral-100",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {cta && (
            <div className="shrink-0 border-t border-neutral-200 p-4">
              <Button asChild withArrow className="w-full">
                <Link href={cta.ctaHref} {...linkProps({ href: cta.ctaHref, newTab: cta.ctaNewTab })}>
                  {cta.ctaLabel}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
