// Default homepage layout (shared by the insert-only seed and by the admin's
// "Load default layout" action). Every string comes from the site's existing
// content (HomePageContent, Services, Projects, Testimonials, FAQs, stats, process
// steps); where the site has nothing the field is empty or a clearly flagged
// [PLACEHOLDER] that the admin shows as "needs content".
import type { Prisma, PrismaClient } from "../generated/client/index.js";

export type HomeSection = { type: string; content: Prisma.InputJsonObject };

const btn = (label: string | null | undefined, href: string | null | undefined, style: "primary" | "secondary" = "primary") => ({
  label: label ?? "",
  href: href ?? "",
  style,
  newTab: false,
});

export async function buildHomeSections(prisma: PrismaClient): Promise<HomeSection[]> {
  const [home, stats, steps, services, projects, technologies, testimonials, faqs, contactEmail] = await Promise.all([
    prisma.homePageContent.findFirst(),
    prisma.homeStat.findMany({ where: { isEnabled: true }, orderBy: { order: "asc" }, take: 4 }),
    prisma.homeProcessStep.findMany({ where: { isEnabled: true }, orderBy: { order: "asc" }, take: 6 }),
    prisma.service.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], take: 12, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ isFeatured: "desc" }, { order: "asc" }], take: 6, select: { id: true } }),
    prisma.technology.findMany({ orderBy: { name: "asc" }, take: 8, select: { name: true } }),
    prisma.testimonial.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" }, take: 8, select: { id: true } }),
    prisma.faq.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" }, take: 6, select: { id: true } }),
    prisma.siteSetting.findUnique({ where: { key: "contact_email" } }),
  ]);

  const pkg = (title: string, extra: Record<string, unknown> = {}) => ({
    title,
    pricePrefix: "from",
    price: "[PRICE]",
    billingNote: "one-time project",
    description: "[SHORT DESCRIPTION]",
    features: [{ text: "[FEATURE 1]" }, { text: "[FEATURE 2]" }, { text: "[FEATURE 3]" }],
    highlighted: false,
    badge: "",
    button: btn("Get a quote", "/contact", "primary"),
    ...extra,
  });
  const packages = [
    pkg("Starter"),
    pkg("Professional", { highlighted: true, badge: "Most popular" }),
    pkg("Custom Quote", { pricePrefix: "", price: "Let's talk", billingNote: "tailored to your project" }),
  ];

  const email = typeof contactEmail?.value === "string" ? contactEmail.value : "";

  const tiles: Prisma.InputJsonObject[] = [];
  if (projects[0]) tiles.push({ kind: "project", size: "wide", tone: "dark", title: "", value: "", image: null, video: null, project: [projects[0].id], link: "" });
  if (stats[0]) tiles.push({ kind: "stat", size: "small", tone: "accent", title: stats[0].title, value: `${stats[0].number}${stats[0].suffix ?? ""}`, image: null, video: null, project: [], link: "" });
  if (stats[1]) tiles.push({ kind: "stat", size: "small", tone: "dark", title: stats[1].title, value: `${stats[1].number}${stats[1].suffix ?? ""}`, image: null, video: null, project: [], link: "" });

  return [
    {
      type: "hero",
      content: {
        eyebrow: home?.heroBadgeText ?? "",
        heading: home?.heroHeadline ?? "",
        body: home?.heroDescription ?? home?.heroSubheadline ?? "",
        primaryButton: btn(home?.heroCtaLabel, home?.heroCtaHref, "primary"),
        secondaryButton: home?.heroSecondaryCtaEnabled ? btn(home.heroSecondaryCtaLabel, home.heroSecondaryCtaHref, "secondary") : btn("", "", "secondary"),
        tiles,
        stats: [],
      },
    },
    {
      type: "marquee",
      content: { items: technologies.map((t) => ({ text: t.name, image: null })), speed: 30, pauseOnHover: true, tone: "accent" },
    },
    {
      type: "services_list",
      content: {
        eyebrow: "",
        heading: home?.servicesHeading ?? "Services",
        intro: home?.servicesDescription ?? "",
        services: services.map((s) => s.id),
        showPrices: true,
        pricePrefix: "From",
        button: btn("", "", "secondary"),
      },
    },
    {
      type: "selected_work",
      content: {
        eyebrow: "",
        heading: home?.portfolioHeading ?? "Selected work",
        projects: projects.slice(0, 3).map((p) => p.id),
        showResult: false,
        button: btn(home?.portfolioButtonLabel ?? "View full portfolio", "/portfolio", "secondary"),
      },
    },
    {
      type: "results",
      content: {
        heading: "",
        items: stats.map((s) => ({ value: `${s.number}${s.suffix ?? ""}`, label: s.title, note: s.description ?? "" })),
        variant: "grid",
        countUp: true,
      },
    },
    {
      type: "process",
      content: {
        eyebrow: "",
        heading: home?.processHeading ?? "How a project runs",
        steps: steps.map((s, i) => ({ number: String(i + 1), title: s.title, description: s.description, meta: "", icon: "" })),
      },
    },
    {
      type: "pricing",
      content: { eyebrow: "", heading: "Clear starting prices", intro: "[SHORT PRICING INTRO]", packages },
    },
    {
      type: "testimonials",
      content: { eyebrow: "", heading: home?.testimonialsHeading ?? "", testimonials: testimonials.map((t) => t.id), autoplay: false, intervalSeconds: 7 },
    },
    {
      type: "faq",
      content: {
        eyebrow: "",
        heading: "Questions, answered.",
        helpLine: "Still curious?",
        helpLink: btn("Send us a message", "/contact", "secondary"),
        firstOpen: true,
        faqs: faqs.map((f) => f.id),
        items: [],
      },
    },
    {
      type: "inquiry_form",
      content: {
        heading: home?.contactCtaHeading ?? "Got a project? Let's talk.",
        body: home?.contactCtaDescription ?? "Tell us about it — most people hear back within one business day.",
        email: email || "[YOUR EMAIL]",
        showPhone: true,
        showCompany: true,
        showService: true,
        serviceOptions: services.map((s) => ({ label: s.name })),
        showBudget: true,
        budgetOptions: ["Under $1k", "$1k – $5k", "$5k – $10k", "$10k+"].map((label) => ({ label })),
        submitLabel: home?.contactCtaButtonText ?? "Send enquiry",
        successMessage: "Thank you — we received your message and will reply within one business day.",
        errorMessage: "Something went wrong. Please try again or email us directly.",
      },
    },
  ];
}

