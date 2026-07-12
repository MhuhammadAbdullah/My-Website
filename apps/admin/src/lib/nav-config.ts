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
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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

export const adminNavGroups: AdminNavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    key: "content",
    label: "Content",
    icon: Layers,
    items: [
      { label: "Home Page", href: "/home", icon: Home },
      { label: "About Page", href: "/about", icon: Compass },
      { label: "Services", href: "/services", icon: Briefcase },
      { label: "Categories", href: "/categories", icon: Tags },
      { label: "Portfolio", href: "/portfolio", icon: FolderKanban },
      { label: "Testimonials", href: "/testimonials", icon: Quote },
      { label: "FAQs", href: "/faqs", icon: HelpCircle },
      { label: "Team", href: "/team", icon: Users },
      { label: "Affiliate Tools", href: "/affiliate", icon: Link2 },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: Landmark,
    items: [
      { label: "Quotations", href: "/finance/quotations", icon: FileText },
      { label: "Invoices", href: "/finance/invoices", icon: Receipt },
      { label: "Payments", href: "/finance/payments", icon: Wallet },
      { label: "Clients", href: "/finance/clients", icon: Building2 },
      { label: "Reports", href: "/finance/reports", icon: FileBarChart },
      { label: "Finance Settings", href: "/finance/settings", icon: SlidersHorizontal },
    ],
  },
  {
    key: "site",
    label: "Site",
    icon: Globe,
    items: [
      { label: "Navigation", href: "/navigation", icon: Compass },
      { label: "Footer", href: "/footer", icon: PanelBottom },
      { label: "SEO", href: "/seo", icon: SearchCheck },
      { label: "Messages", href: "/analytics", icon: Mail },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Privacy Policy", href: "/privacy-policy", icon: ShieldCheck },
      { label: "Terms & Conditions", href: "/terms", icon: Scale },
    ],
  },
  {
    key: "access",
    label: "Access",
    icon: Lock,
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Roles", href: "/roles", icon: ShieldCheck },
      { label: "Permissions", href: "/permissions", icon: KeyRound },
    ],
  },
];
