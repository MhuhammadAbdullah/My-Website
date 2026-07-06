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
  BarChart3,
  Settings,
  ShieldCheck,
  KeyRound,
  Home,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Content",
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
    label: "Site",
    items: [
      { label: "Navigation", href: "/navigation", icon: Compass },
      { label: "Footer", href: "/footer", icon: PanelBottom },
      { label: "SEO", href: "/seo", icon: SearchCheck },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    label: "Access",
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Roles", href: "/roles", icon: ShieldCheck },
      { label: "Permissions", href: "/permissions", icon: KeyRound },
    ],
  },
];
