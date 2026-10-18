import Link from "next/link";
import { SocialIcon, type SocialPlatformId } from "@agency/ui";
import { SOCIAL_PLATFORM_IDS } from "@agency/types";
import type { NavItemRead, SiteSettings } from "@/lib/types";
import type { ResolvedBranding } from "@/lib/branding";

type FooterLink = { label: string; href: string; newTab?: boolean };

function FooterAnchor({ link }: { link: FooterLink }) {
  const external = link.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <Link href={link.href} {...external} className="rounded text-neutral-500 transition-colors hover:text-heading">
      {link.label}
    </Link>
  );
}

// Everything here comes from Site Settings: brand/tagline/copyright from
// Branding, link columns + legal links from their own settings, socials from
// Social Media. A group with nothing in it is simply not rendered.
export function SiteFooter({
  navItems,
  settings,
  branding,
}: {
  navItems: NavItemRead[];
  settings: SiteSettings;
  branding: ResolvedBranding;
}) {
  const socials = SOCIAL_PLATFORM_IDS.map((id) => [id, settings.socials?.[id]] as [SocialPlatformId, string | undefined]).filter(
    (entry): entry is [SocialPlatformId, string] => !!entry[1],
  );
  const columns = (settings.footer_columns ?? []).filter((c) => c.title && c.links.some((l) => l.label && l.href));
  // Older installs have no legal_links setting yet -- fall back to the FOOTER nav items they used before.
  const legal: FooterLink[] = (settings.legal_links ?? navItems.map((n) => ({ label: n.label, href: n.href, newTab: n.openInNewTab }))).filter(
    (l) => l.label && l.href,
  );

  return (
    <footer className="border-t border-neutral-200 bg-surface" aria-label="Site footer">
      <div className="mx-auto w-full max-w-[var(--layout-max)] px-[var(--layout-pad)] py-16">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            {branding.footerLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset
              <img src={branding.footerLogoUrl} alt={branding.name} className="h-10 w-auto object-contain" />
            ) : (
              branding.name && <p className="font-heading text-h3 font-extrabold tracking-tight text-heading">{branding.name}</p>
            )}
            {branding.footerTagline && <p className="mt-4 text-body-sm text-neutral-500">{branding.footerTagline}</p>}
            {socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap items-center gap-3" aria-label="Social media">
                {socials.map(([id, href]) => (
                  <li key={id}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={id}
                      className="flex size-10 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 transition-colors hover:border-accent-500 hover:text-accent-500"
                    >
                      <SocialIcon platform={id} className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {columns.length > 0 && (
            <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              {columns.map((col) => (
                <div key={col.title}>
                  <p className="eyebrow">{col.title}</p>
                  <ul className="mt-4 space-y-3 text-body-sm">
                    {col.links
                      .filter((l) => l.label && l.href)
                      .map((l) => (
                        <li key={`${l.label}-${l.href}`}>
                          <FooterAnchor link={l} />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </nav>
          )}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-neutral-200 pt-6 text-body-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{branding.copyright}</p>
          {legal.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Legal">
              {legal.map((l) => (
                <li key={`${l.label}-${l.href}`}>
                  <FooterAnchor link={l} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
