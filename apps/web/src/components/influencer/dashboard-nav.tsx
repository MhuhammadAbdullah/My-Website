"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Container, cn } from "@agency/ui";
import { influencerAuthClient } from "@/lib/influencer-auth-client";
import { InfluencerNotificationBell } from "./notification-bell";

const LINKS: { label: string; href: string }[] = [
  { label: "Overview", href: "/influencer/dashboard" },
  { label: "Bookings", href: "/influencer/dashboard/bookings" },
  { label: "Earnings", href: "/influencer/dashboard/earnings" },
  { label: "Discounts", href: "/influencer/dashboard/discounts" },
  { label: "Analytics", href: "/influencer/dashboard/analytics" },
  { label: "Portfolio", href: "/influencer/dashboard/portfolio" },
  { label: "Pricing", href: "/influencer/dashboard/pricing" },
  { label: "Profile", href: "/influencer/dashboard/profile" },
  { label: "Insights Guide", href: "/influencer/dashboard/insights-guide" },
];

export function InfluencerDashboardNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await influencerAuthClient.signOut();
    router.push("/influencer/login");
    router.refresh();
  }

  return (
    <div className="border-b border-neutral-200">
      <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-6">
          <span className="text-body-sm font-medium text-neutral-500">{name}</span>
          <nav className="flex gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
                  pathname === link.href ? "bg-heading text-background" : "text-neutral-600 hover:bg-neutral-100",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <InfluencerNotificationBell />
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Log out
          </Button>
        </div>
      </Container>
    </div>
  );
}
