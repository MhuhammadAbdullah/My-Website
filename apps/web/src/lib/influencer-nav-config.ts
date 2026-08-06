import {
  BarChart3,
  BookOpen,
  CalendarClock,
  Image as ImageIcon,
  LayoutDashboard,
  Percent,
  Tag,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface InfluencerNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const influencerNavItems: InfluencerNavItem[] = [
  { label: "Overview", href: "/influencer/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/influencer/dashboard/bookings", icon: CalendarClock },
  { label: "Earnings", href: "/influencer/dashboard/earnings", icon: Wallet },
  { label: "Discounts", href: "/influencer/dashboard/discounts", icon: Percent },
  { label: "Analytics", href: "/influencer/dashboard/analytics", icon: BarChart3 },
  { label: "Portfolio", href: "/influencer/dashboard/portfolio", icon: ImageIcon },
  { label: "Pricing", href: "/influencer/dashboard/pricing", icon: Tag },
  { label: "Profile", href: "/influencer/dashboard/profile", icon: User },
  { label: "Insights Guide", href: "/influencer/dashboard/insights-guide", icon: BookOpen },
];

export function getInfluencerPageTitle(pathname: string): string {
  const exact = influencerNavItems.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const byPrefix = influencerNavItems.find((item) => item.href !== "/influencer/dashboard" && pathname.startsWith(`${item.href}/`));
  return byPrefix?.label ?? "Dashboard";
}
