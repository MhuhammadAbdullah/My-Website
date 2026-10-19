// Noir Lime foundation seed -- INSERT-ONLY and idempotent.
//
//   pnpm --filter @agency/database db:seed-cms            # apply
//   pnpm --filter @agency/database db:seed-cms -- --dry   # print what it would do, write nothing
//
// Guarantees (safe to run against production, any number of times):
//   - never overwrites an existing SiteSetting value (brand name, logo, contact,
//     SEO...). A setting is created only when its key does not exist yet.
//   - never overwrites or deletes page content: the default Page is created only
//     when its slug does not exist yet.
//   - RBAC: adds the new permissions, grants them to Super Admin (add only), and
//     syncs the Editor role to its intended set. It does not touch any other role.
//
// Do NOT use prisma/seed.ts against a live database: it upserts settings with
// `update: { value }` and recreates nav items, i.e. it resets site content.
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "../generated/client/index.js";
import { buildHomeSections } from "../src/home-layout.js";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");
const log = (msg: string) => console.log(`${DRY ? "[dry] " : ""}${msg}`);

const ACTIONS = ["view", "create", "update", "delete"] as const;
const NEW_RESOURCES = ["pages", "collections", "leads"] as const;

// Editor = content only. Deliberately absent: settings (incl. branding),
// navigation, footer, users, roles, permissions, emailTemplates, finance...
const EDITOR_RESOURCES = [
  "home", "about", "services", "pricing", "portfolio", "projects", "categories",
  "testimonials", "faqs", "team", "affiliate", "media", "seo", "analytics",
  "pages", "collections", "leads",
];

async function syncRbac() {
  const permissionIds = new Map<string, string>(); // "resource:action" -> id
  for (const resource of NEW_RESOURCES) {
    for (const action of ACTIONS) {
      const existing = await prisma.permission.findUnique({ where: { resource_action: { resource, action } } });
      if (existing) {
        permissionIds.set(`${resource}:${action}`, existing.id);
      } else if (DRY) {
        log(`would create permission ${action}:${resource}`);
      } else {
        const created = await prisma.permission.create({ data: { resource, action, label: `${action}:${resource}` } });
        permissionIds.set(`${resource}:${action}`, created.id);
        log(`created permission ${action}:${resource}`);
      }
    }
  }

  // Super Admin: add-only (never removes anything from it).
  const superAdmin = await prisma.role.findUnique({ where: { slug: "super-admin" } });
  if (superAdmin && !DRY) {
    const res = await prisma.rolePermission.createMany({
      data: [...permissionIds.values()].map((permissionId) => ({ roleId: superAdmin.id, permissionId })),
      skipDuplicates: true,
    });
    log(`super-admin: ${res.count} new permission(s) granted`);
  }

  const editor = await prisma.role.findUnique({ where: { slug: "editor" }, include: { users: { select: { email: true } } } });
  if (!editor) {
    log("no 'editor' role found -- skipping Editor sync");
    return;
  }
  log(`editor role currently has ${editor.users.length} user(s): ${editor.users.map((u) => u.email).join(", ") || "(none)"}`);

  const allPermissions = await prisma.permission.findMany();
  const desired = allPermissions.filter((p) => EDITOR_RESOURCES.includes(p.resource));
  const desiredIds = new Set(desired.map((p) => p.id));

  const current = await prisma.rolePermission.findMany({ where: { roleId: editor.id } });
  const toRemove = current.filter((rp) => !desiredIds.has(rp.permissionId));
  const toAdd = desired.filter((p) => !current.some((rp) => rp.permissionId === p.id));
  log(`editor: +${toAdd.length} / -${toRemove.length} permission(s)`);

  if (!DRY) {
    if (toRemove.length) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: editor.id, permissionId: { in: toRemove.map((rp) => rp.permissionId) } },
      });
    }
    if (toAdd.length) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((p) => ({ roleId: editor.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }
}

async function ensureSetting(key: string, value: Prisma.InputJsonValue) {
  const existing = await prisma.siteSetting.findUnique({ where: { key } });
  if (existing) return log(`setting '${key}' exists -- left untouched`);
  log(`creating setting '${key}'`);
  if (!DRY) await prisma.siteSetting.create({ data: { key, value } });
}

async function seedSettings() {
  const setting = async (key: string) => (await prisma.siteSetting.findUnique({ where: { key } }))?.value;

  await ensureSetting("theme", { accent: "lime" });
  // Matches the CTA the header has always shown ("Start a project" -> /contact).
  await ensureSetting("header", { ctaVisible: true, ctaLabel: "Start a project", ctaHref: "/contact", ctaNewTab: false });
  // Matches the link columns the footer has always shown.
  await ensureSetting("footer_columns", [
    {
      title: "Company",
      links: [
        { label: "About", href: "/about", newTab: false },
        { label: "Services", href: "/services", newTab: false },
        { label: "Portfolio", href: "/portfolio", newTab: false },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Affiliate Tools", href: "/affiliate-tools", newTab: false },
        { label: "Contact", href: "/contact", newTab: false },
      ],
    },
  ]);

  // The "Legal" column was built from FOOTER nav items; carry those over once.
  const footerNav = await prisma.navItem.findMany({ where: { location: "FOOTER", parentId: null }, orderBy: { order: "asc" } });
  await ensureSetting(
    "legal_links",
    footerNav.map((n) => ({ label: n.label, href: n.href, newTab: false })),
  );

  // {brand}/{year} tokens are filled in at render time from Branding -- no brand literal here.
  await ensureSetting("seo_defaults", {
    titleTemplate: "%s | {brand}",
    defaultTitle: "{brand} — Premium Web Design & Engineering",
    description:
      "{brand} designs and engineers premium web products for startups and teams who refuse to ship something average.",
    ogImageUrl: "",
    twitterHandle: "",
  });
  await ensureSetting("organization", { legalName: "", description: "", foundingDate: "", areaServed: "" });

  const day = (closed: boolean) => ({ closed, open: "09:00", close: "18:00" });
  await ensureSetting("business_schedule", {
    mon: day(false), tue: day(false), wed: day(false), thu: day(false), fri: day(false), sat: day(true), sun: day(true),
  });
  await ensureSetting("timezone", "Asia/Karachi");
  await ensureSetting("whatsapp_message", "Hi! I'd like to talk about a project.");

  // Private (never served by the public GET /settings): where admin alerts go.
  const contactEmail = await setting("contact_email");
  await ensureSetting("notifications", {
    emails: typeof contactEmail === "string" && /^\S+@\S+\.\S+$/.test(contactEmail) ? [contactEmail] : [],
  });

  // Branding: only ADD sub-keys that are absent; every existing value stays as-is.
  const branding = await prisma.siteSetting.findUnique({ where: { key: "branding" } });
  if (branding && typeof branding.value === "object" && branding.value && !Array.isArray(branding.value)) {
    const current = branding.value as Record<string, Prisma.JsonValue>;
    const additions: Record<string, Prisma.InputJsonValue | null> = {
      logoDarkMediaId: null,
      logoDarkUrl: null,
      faviconMediaId: null,
      faviconUrl: null,
      footerTagline: "Premium web design and engineering for teams who refuse to ship something average.",
      copyrightText: "",
      emailSenderName: "",
    };
    const missing = Object.entries(additions).filter(([k]) => !(k in current));
    if (missing.length) {
      log(`branding: adding ${missing.length} absent field(s): ${missing.map(([k]) => k).join(", ")}`);
      if (!DRY) {
        await prisma.siteSetting.update({
          where: { key: "branding" },
          data: { value: { ...current, ...Object.fromEntries(missing) } as Prisma.InputJsonObject },
        });
      }
    } else {
      log("branding: already complete -- left untouched");
    }
  } else {
    log("no 'branding' setting yet -- not creating one (brand name is never invented by the seed)");
  }
}

// The homepage layout lives in the `home_sections` setting (managed in Admin > Home Page).
// Created once from the site's existing content; never overwritten afterwards.
async function seedServicesPage() {
  await ensureSetting("services_page", {
    labels: { all: "All", pricesIn: "Prices in", from: "From", perMonth: "/mo", getQuote: "Get a quote", details: "Service details", whatYouGet: "What you get", timeline: "Timeline", onRequest: "On request" },
    // Placeholder rates -- set your own in Admin > Services > Page Sections.
    currencies: [{ code: "USD", rate: 1 }, { code: "PKR", rate: 280 }, { code: "SAR", rate: 3.75 }],
    engagement: {
      heading: "Ways to work with us",
      intro: "Choose the model that fits your stage. You can switch as you grow.",
      models: [
        { label: "Fixed project", title: "One clear scope, one price", description: "Best for new websites, stores and redesigns with a defined finish line.", highlighted: false },
        { label: "Monthly retainer", title: "Ongoing growth, every month", description: "Best for SEO, marketing, maintenance and continuous improvements.", highlighted: true },
        { label: "Dedicated team", title: "Your extended product team", description: "Best for web apps and products that ship new features continuously.", highlighted: false },
      ],
    },
    estimate: {
      heading: "Estimate your project",
      intro: "Select what you need — we'll confirm the final quote on a free call.",
      cardLabel: "Estimated starting budget",
      note: "{count} service(s) selected · one-time + monthly items combined. Final pricing depends on scope.",
      emptyText: "Select services",
      button: { label: "Send this estimate", href: "/contact" },
    },
  });
}

async function seedPortfolioPage() {
  await ensureSetting("portfolio_page", {
    labels: {
      featured: "Featured", all: "All", searchPlaceholder: "Search projects", grid: "Grid", list: "List", loadMore: "Load more projects",
      showing: "Showing {shown} of {total}", readCaseStudy: "Read case study", projectsShipped: "Projects shipped", industriesServed: "Industries served",
      noResults: "No projects match your filters yet.",
    },
    pageSize: 7,
    cta: { heading: "Your project could be **next.**", button: { label: "Start a project", href: "/contact" } },
  });
}

async function seedHomeSections() {
  if (await prisma.siteSetting.findUnique({ where: { key: "home_sections" } })) return log("setting 'home_sections' exists -- left untouched");
  const built = await buildHomeSections(prisma);
  await ensureSetting("home_sections", built.map((s) => ({ id: randomUUID(), type: s.type, visible: true, content: s.content })) as unknown as Prisma.InputJsonValue);
}

async function main() {
  await syncRbac();
  await seedSettings();
  await seedHomeSections();
  await seedServicesPage();
  await seedPortfolioPage();
  log("done");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
