import type { MetadataRoute } from "next";
import { getProjects, getServices } from "@/lib/api";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/services",
    "/portfolio",
    "/about",
    "/contact",
    "/affiliate-tools",
    "/privacy-policy",
    "/terms",
  ].map((path) => ({
    url: `${env.NEXT_PUBLIC_SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const [services, projectsPage] = await Promise.all([
    getServices().catch(() => []),
    getProjects({ pageSize: 100 }).catch(() => ({ items: [] }) as never),
  ]);

  const serviceRoutes = services.map((s) => ({
    url: `${env.NEXT_PUBLIC_SITE_URL}/services/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const projectRoutes = projectsPage.items.map((p) => ({
    url: `${env.NEXT_PUBLIC_SITE_URL}/portfolio/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...serviceRoutes, ...projectRoutes];
}
