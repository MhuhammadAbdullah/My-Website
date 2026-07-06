import Link from "next/link";
import { SocialIcon, type SocialPlatformId } from "@agency/ui";
import { SOCIAL_PLATFORM_IDS } from "@agency/types";
import type { NavItemRead, SiteSettings } from "@/lib/types";
import type { ResolvedBranding } from "@/lib/branding";

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

  return (
    <footer className="bg-neutral-950 text-neutral-400">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            {branding.logoUrl ? (
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset */}
                <img src={branding.logoUrl} alt={branding.name} className="size-full rounded-full object-cover" />
              </span>
            ) : (
              <p className="font-heading text-h4 font-semibold text-white">{branding.name}</p>
            )}
            <p className="mt-3 text-body-sm">
              Premium web design and engineering for teams who refuse to ship something average.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {socials.map(([id, href]) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={id}
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 transition-colors hover:border-white/30 hover:text-white"
                >
                  <SocialIcon platform={id} className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="font-mono text-label uppercase tracking-wide text-neutral-500">Company</p>
              <ul className="mt-4 space-y-2.5 text-body-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/services" className="hover:text-white">Services</Link></li>
                <li><Link href="/portfolio" className="hover:text-white">Portfolio</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-label uppercase tracking-wide text-neutral-500">Resources</p>
              <ul className="mt-4 space-y-2.5 text-body-sm">
                <li><Link href="/affiliate-tools" className="hover:text-white">Affiliate Tools</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-label uppercase tracking-wide text-neutral-500">Legal</p>
              <ul className="mt-4 space-y-2.5 text-body-sm">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-body-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {branding.name}. All rights reserved.</p>
          <p className="font-mono text-label text-neutral-600">Built with Next.js on Vercel</p>
        </div>
      </div>
    </footer>
  );
}
