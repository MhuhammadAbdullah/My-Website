import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Briefcase,
  Tags,
  FolderKanban,
  Quote,
  HelpCircle,
  Users,
  Link2,
  Compass,
  PanelBottom,
  SearchCheck,
  Mail,
  Settings,
  ShieldCheck,
  KeyRound,
  Home,
  Send,
  FileText,
  Receipt,
  Wallet,
  Building2,
  SlidersHorizontal,
  FileBarChart,
  Layers,
  Landmark,
  Globe,
  Lock,
  Scale,
  Plug,
  Sparkles,
  UserCheck,
  DollarSign,
  CalendarClock,
  Banknote,
  Percent,
  Tag,
  TrendingUp,
  Award,
  FileBarChart2,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  // Permission resource gating this item's visibility/access ("view" action)
  // -- see apps/api/src/middleware/require-auth.ts for the resource:action
  // model this mirrors. null means always visible (no permission required).
  resource: string | null;
}

export interface AdminNavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

export function getPageTitle(pathname: string): string {
  const allItems = adminNavGroups.flatMap((group) => group.items);

  const exact = allItems.find((item) => item.href === pathname);
  if (exact) return exact.label;

  const prefixMatches = allItems
    .filter((item) => item.href !== "/" && pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length);
  if (prefixMatches[0]) return prefixMatches[0].label;

  const segment = pathname.split("/").filter(Boolean).pop();
  if (!segment) return "Dashboard";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function findGroupKeyForPath(pathname: string): string | null {
  for (const group of adminNavGroups) {
    const isActive = group.items.some(
      (item) => item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
    );
    if (isActive) return group.key;
  }
  return null;
}

// Every nav item whose href exactly matches, or is a parent segment of,
// `pathname` (e.g. /team/[id]/edit is covered by the "/team" item even
// though it isn't itself in the nav) -- collected as a set because a few
// hrefs are intentionally shared by two items with different resources
// (e.g. /categories is both the content "Categories" item and the
// influencer-marketplace "Categories" item). Access to the path is allowed
// if the user has view permission on ANY of the returned resources.
// An empty array means the path isn't gated by any nav item (e.g. "/",
// or an admin page with no nav entry) -- callers should treat that as
// unrestricted rather than default-deny.
export function getRequiredResourcesForPath(pathname: string): string[] {
  const allItems = adminNavGroups.flatMap((group) => group.items);
  const matches = allItems.filter(
    (item) => item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
  );
  return Array.from(new Set(matches.map((item) => item.resource).filter((r): r is string => r !== null)));
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard, resource: null }],
  },
  {
    key: "content",
    label: "Content",
    icon: Layers,
    items: [
      { label: "Home Page", href: "/home", icon: Home, resource: "home" },
      { label: "About Page", href: "/about", icon: Compass, resource: "about" },
      { label: "Services", href: "/services", icon: Briefcase, resource: "services" },
      { label: "Categories", href: "/categories", icon: Tags, resource: "categories" },
      { label: "Portfolio", href: "/portfolio", icon: FolderKanban, resource: "projects" },
      { label: "Testimonials", href: "/testimonials", icon: Quote, resource: "testimonials" },
      { label: "FAQs", href: "/faqs", icon: HelpCircle, resource: "faqs" },
      { label: "Team", href: "/team", icon: Users, resource: "team" },
      { label: "Affiliate Tools", href: "/affiliate", icon: Link2, resource: "affiliate" },
      { label: "Contact Page", href: "/contact", icon: Send, resource: "contact" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: Landmark,
    items: [
      { label: "Quotations", href: "/finance/quotations", icon: FileText, resource: "quotations" },
      { label: "Invoices", href: "/finance/invoices", icon: Receipt, resource: "invoices" },
      { label: "Payments", href: "/finance/payments", icon: Wallet, resource: "payments" },
      { label: "Clients", href: "/finance/clients", icon: Building2, resource: "clients" },
      { label: "Reports", href: "/finance/reports", icon: FileBarChart, resource: "invoices" },
      { label: "Finance Settings", href: "/finance/settings", icon: SlidersHorizontal, resource: "financeSettings" },
    ],
  },
  {
    key: "site",
    label: "Site",
    icon: Globe,
    items: [
      { label: "Navigation", href: "/navigation", icon: Compass, resource: "navigation" },
      { label: "Footer", href: "/footer", icon: PanelBottom, resource: "navigation" },
      { label: "SEO", href: "/seo", icon: SearchCheck, resource: "seo" },
      { label: "Integrations", href: "/integrations", icon: Plug, resource: "settings" },
      { label: "Messages", href: "/analytics", icon: Mail, resource: "settings" },
      { label: "Settings", href: "/settings", icon: Settings, resource: "settings" },
      { label: "Privacy Policy", href: "/privacy-policy", icon: ShieldCheck, resource: "legal" },
      { label: "Terms & Conditions", href: "/terms", icon: Scale, resource: "legal" },
    ],
  },
  {
    key: "communications",
    label: "Communications",
    icon: Mail,
    items: [{ label: "Email Templates", href: "/email-templates", icon: Mail, resource: "emailTemplates" }],
  },
  {
    key: "influencers",
    label: "Influencer Marketplace",
    icon: Sparkles,
    items: [
      { label: "Influencers", href: "/influencers", icon: Users, resource: "influencers" },
      { label: "Applications", href: "/influencers/applications", icon: UserCheck, resource: "influencerApplications" },
      { label: "Bookings", href: "/influencers/bookings", icon: CalendarClock, resource: "bookings" },
      { label: "Categories", href: "/categories?tab=influencers", icon: Tags, resource: "influencerCategories" },
      { label: "Pricing", href: "/influencers/pricing", icon: DollarSign, resource: "influencers" },
      { label: "Payouts", href: "/influencers/payouts", icon: Banknote, resource: "influencerPayouts" },
      { label: "Commission", href: "/influencers/commission", icon: Percent, resource: "influencerSettings" },
      { label: "Discounts", href: "/influencers/discounts", icon: Tag, resource: "discounts" },
      { label: "Performance", href: "/influencers/performance", icon: TrendingUp, resource: "influencers" },
      { label: "Badges", href: "/influencers/badges", icon: Award, resource: "influencerBadges" },
      { label: "Reviews", href: "/influencers/reviews", icon: Quote, resource: "influencers" },
      { label: "Settings", href: "/influencers/settings", icon: SlidersHorizontal, resource: "influencerSettings" },
      { label: "Reports", href: "/influencers/reports", icon: FileBarChart2, resource: "influencers" },
    ],
  },
  {
    key: "access",
    label: "Access",
    icon: Lock,
    items: [
      { label: "Users", href: "/users", icon: Users, resource: "users" },
      { label: "Roles", href: "/roles", icon: ShieldCheck, resource: "roles" },
      { label: "Permissions", href: "/permissions", icon: KeyRound, resource: "permissions" },
    ],
  },
];
