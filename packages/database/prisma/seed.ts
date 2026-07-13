import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  type Prisma,
  type TechCategory,
  type FaqContext,
  type Technology,
  type Faq,
  type Skill,
} from "../generated/client/index.js";

const prisma = new PrismaClient();

const AGENCY_NAME = "MAB Digital";

function img(publicId: string, w = 1600, h = 1000, seedNum = 1) {
  return {
    publicId,
    url: `https://picsum.photos/seed/${seedNum}/${w}/${h}`,
    width: w,
    height: h,
    format: "jpg",
    altText: publicId.replace(/[-/]/g, " "),
  };
}

async function main() {
  console.log(`Seeding ${AGENCY_NAME}...`);

  // ---------------------------------------------------------------------
  // RBAC
  // ---------------------------------------------------------------------
  const resources = [
    "home", "about", "services", "pricing", "portfolio", "projects", "categories",
    "testimonials", "faqs", "team", "affiliate", "media", "navigation",
    "footer", "seo", "analytics", "settings", "users", "roles", "permissions",
    "clients", "quotations", "invoices", "payments", "financeSettings", "legal",
  ];
  const actions = ["view", "create", "update", "delete"];

  const permissions = [];
  for (const resource of resources) {
    for (const action of actions) {
      permissions.push(
        await prisma.permission.upsert({
          where: { resource_action: { resource, action } },
          update: {},
          create: { resource, action, label: `${action}:${resource}` },
        }),
      );
    }
  }

  const adminRole = await prisma.role.upsert({
    where: { slug: "super-admin" },
    update: {},
    create: {
      name: "Super Admin",
      slug: "super-admin",
      description: "Full access to every admin module.",
      isSystem: true,
      permissions: {
        create: permissions.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  // The `create` block above only runs the first time this role is created --
  // on every later reseed (e.g. after adding new resources) `update: {}` is a
  // no-op, so newly-added permissions would silently never reach an
  // already-existing Super Admin role. Re-sync explicitly, every run.
  for (const p of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  await prisma.role.upsert({
    where: { slug: "editor" },
    update: {},
    create: {
      name: "Editor",
      slug: "editor",
      description: "Can manage content but not users, roles, or settings.",
      isSystem: true,
      permissions: {
        create: permissions
          .filter((p) => !["users", "roles", "permissions", "settings"].includes(p.resource))
          .map((p) => ({ permissionId: p.id })),
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@mabdigital.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@mabdigital.com",
      emailVerified: true,
      roleId: adminRole.id,
    },
  });

  // ---------------------------------------------------------------------
  // Technologies
  // ---------------------------------------------------------------------
  const techData: Array<{ name: string; category: TechCategory }> = [
    { name: "Next.js", category: "FRONTEND" },
    { name: "React", category: "FRONTEND" },
    { name: "TypeScript", category: "FRONTEND" },
    { name: "Tailwind CSS", category: "FRONTEND" },
    { name: "Node.js", category: "BACKEND" },
    { name: "Express", category: "BACKEND" },
    { name: "PostgreSQL", category: "DATABASE" },
    { name: "Prisma", category: "DATABASE" },
    { name: "Redis", category: "DATABASE" },
    { name: "Docker", category: "DEVOPS" },
    { name: "Vercel", category: "DEVOPS" },
    { name: "Figma", category: "DESIGN" },
  ];
  const technologies: Technology[] = [];
  for (const [i, t] of techData.entries()) {
    technologies.push(
      await prisma.technology.upsert({
        where: { slug: t.name.toLowerCase().replace(/[.\s]/g, "-") },
        update: {},
        create: {
          name: t.name,
          slug: t.name.toLowerCase().replace(/[.\s]/g, "-"),
          category: t.category,
          order: i,
        },
      }),
    );
  }
  const techByName = (n: string) => technologies.find((t) => t.name === n)!.id;

  // ---------------------------------------------------------------------
  // Testimonials
  // ---------------------------------------------------------------------
  const testimonialSeed = [
    { author: "Elena Marsh", role: "Founder", company: "Northline Goods", quote: "MAB Digital didn't just build our site — they rebuilt how we think about our product. Every screen feels considered.", rating: 5 },
    { author: "Dev Patel", role: "VP Engineering", company: "Harbor Analytics", quote: "The handoff was the cleanest I've seen from an agency. Typed contracts, real tests, zero surprises in production.", rating: 5 },
    { author: "Sofia Reyes", role: "Head of Growth", company: "Lumen Health", quote: "Our conversion rate on the new marketing site is up 38%. The team understood the business, not just the brief.", rating: 5 },
    { author: "Marcus Webb", role: "CEO", company: "Fieldstone Capital", quote: "They pushed back on our first idea and were right to. The final product is sharper than what we asked for.", rating: 5 },
    { author: "Priya Nair", role: "Product Lead", company: "Ondo Labs", quote: "Fast without feeling rushed. Every sprint shipped something we could actually show customers.", rating: 5 },
    { author: "Tomas Berg", role: "COO", company: "Ridgeway Freight", quote: "Six months post-launch and the admin panel still saves our ops team hours every week.", rating: 4 },
  ];
  const testimonials = [];
  for (const [i, t] of testimonialSeed.entries()) {
    testimonials.push(await prisma.testimonial.create({ data: { ...t, order: i } }));
  }

  // ---------------------------------------------------------------------
  // FAQs
  // ---------------------------------------------------------------------
  const faqSeed: Array<{ question: string; answer: string; context: FaqContext }> = [
    { question: "How long does a typical engagement take?", answer: "Most marketing sites ship in 4–6 weeks; full product builds run 8–14 weeks depending on scope. You'll get a firm timeline after the discovery call.", context: "GENERAL" },
    { question: "Do you work with in-house teams or as a full replacement?", answer: "Both. We slot in alongside your engineers and designers, or run the project end-to-end if you don't have one yet.", context: "GENERAL" },
    { question: "What's included after launch?", answer: "Every plan includes a 30-day warranty period for fixes, plus optional retainer support for ongoing iteration.", context: "SERVICE" },
    { question: "Can I update content myself after the project ships?", answer: "Yes — every project ships with an admin panel so you can edit copy, pricing, portfolio items, and media without touching code.", context: "SERVICE" },
    { question: "How do you price fixed-scope vs custom work?", answer: "Starter/Professional/Business tiers are fixed-scope, fixed-price. Anything bespoke gets a custom quote after a short scoping call.", context: "SERVICE" },
    { question: "Can I filter the portfolio by industry or service type?", answer: "Yes, use the category filters and search above the portfolio grid to narrow results.", context: "PORTFOLIO" },
    { question: "How quickly will I hear back after submitting the contact form?", answer: "Within one business day. For urgent requests, reach us directly on WhatsApp.", context: "CONTACT" },
    { question: "Do affiliate links cost me anything extra?", answer: "No — prices are identical to going direct. We may earn a commission, and some partners extend an exclusive discount to our visitors.", context: "AFFILIATE" },
  ];
  const faqs: Faq[] = [];
  for (const [i, f] of faqSeed.entries()) {
    faqs.push(await prisma.faq.create({ data: { ...f, order: i } }));
  }
  const faqByContext = (ctx: string) => faqs.filter((f) => f.context === ctx);

  // ---------------------------------------------------------------------
  // Services
  // ---------------------------------------------------------------------
  const webCategory = await prisma.serviceCategory.upsert({
    where: { slug: "web-development" }, update: {},
    create: { name: "Web Development", slug: "web-development", order: 0 },
  });
  const productCategory = await prisma.serviceCategory.upsert({
    where: { slug: "product-design" }, update: {},
    create: { name: "Product Design", slug: "product-design", order: 1 },
  });
  const growthCategory = await prisma.serviceCategory.upsert({
    where: { slug: "growth-engineering" }, update: {},
    create: { name: "Growth Engineering", slug: "growth-engineering", order: 2 },
  });

  function pricingFor(base: number, unit: "one-time" | "/mo"): Prisma.PricingPlanCreateWithoutServiceInput[] {
    const billingType = unit === "/mo" ? "MONTHLY" : "ONE_TIME";
    return [
      { name: "Starter", regularPrice: base, billingType, features: ["Up to 5 pages", "Responsive design", "Basic SEO setup", "2 rounds of revisions"], order: 0 },
      { name: "Professional", regularPrice: base * 2.2, billingType, features: ["Up to 12 pages", "Design system + CMS", "Advanced SEO + analytics", "4 rounds of revisions", "Admin panel"], order: 1 },
      { name: "Business", regularPrice: base * 4, billingType, features: ["Unlimited pages", "Custom backend + integrations", "A/B testing setup", "Priority support", "Full admin panel + RBAC"], order: 2 },
      { name: "Custom Quote", isCustomQuote: true, features: ["Scoped to your exact needs", "Dedicated project lead", "Flexible timeline", "Ongoing retainer available"], isFeatured: true, ctaLabel: "Request a Quote", order: 3 },
    ];
  }

  const serviceSeed = [
    {
      categoryId: webCategory.id,
      name: "Marketing Websites",
      slug: "marketing-websites",
      tagline: "Sites that convert visitors before they scroll past the fold.",
      description: "We design and build fast, SEO-ready marketing sites on Next.js — the kind that make your product look as good as it actually is.",
      benefits: ["Lighthouse scores above 95", "Built-in SEO and structured data", "Editable via your own admin panel", "Launch in as little as 4 weeks"],
      process: [
        { title: "Discovery", description: "We map your audience, positioning, and the pages that need to exist." },
        { title: "Design", description: "Wireframes then high-fidelity screens in your brand system." },
        { title: "Build", description: "Next.js + Tailwind implementation with real content, not lorem ipsum." },
        { title: "Launch", description: "QA, performance pass, and a guided handoff to your team." },
      ],
      deliverables: ["Fully responsive site", "CMS/admin access", "SEO + analytics setup", "30-day post-launch support"],
      timeline: "4–6 weeks",
      techs: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
      faqs: faqByContext("SERVICE"),
      isFeatured: true,
      pricing: pricingFor(1500, "one-time"),
    },
    {
      categoryId: webCategory.id,
      name: "Web Application Development",
      slug: "web-application-development",
      tagline: "Custom software for the workflows off-the-shelf tools can't handle.",
      description: "Full-stack product builds — dashboards, internal tools, customer portals — engineered for the long haul, not just the demo.",
      benefits: ["Type-safe end to end", "Scalable Postgres schema design", "Authentication and RBAC included", "Documented, testable codebase"],
      process: [
        { title: "Architecture", description: "Data modeling and system design before a line of UI code." },
        { title: "Iterative build", description: "Weekly demos against a real staging environment." },
        { title: "Hardening", description: "Testing, security review, and performance tuning." },
        { title: "Handoff", description: "Full documentation and an optional support retainer." },
      ],
      deliverables: ["Production application", "Admin/ops dashboard", "API documentation", "Test suite"],
      timeline: "8–14 weeks",
      techs: ["Next.js", "Node.js", "Express", "PostgreSQL", "Prisma"],
      faqs: faqByContext("SERVICE"),
      isFeatured: true,
      pricing: pricingFor(4000, "one-time"),
    },
    {
      categoryId: productCategory.id,
      name: "Product Design",
      slug: "product-design",
      tagline: "Interfaces that feel obvious in hindsight.",
      description: "End-to-end UX/UI for web and product teams who want their software to feel like Linear, not legacy enterprise tooling.",
      benefits: ["Research-backed design decisions", "Full design system delivery", "Figma files you actually own", "Accessibility built in from the start"],
      process: [
        { title: "Research", description: "User interviews and competitive audits before any pixels." },
        { title: "Wireframes", description: "Low-fidelity flows to lock in structure fast." },
        { title: "Visual design", description: "High-fidelity screens and a reusable component library." },
        { title: "Prototype & test", description: "Clickable prototypes validated with real users." },
      ],
      deliverables: ["Figma design system", "Interactive prototype", "Developer handoff spec", "Usability test notes"],
      timeline: "3–5 weeks",
      techs: ["Figma"],
      faqs: faqByContext("SERVICE"),
      isFeatured: false,
      pricing: pricingFor(1200, "one-time"),
    },
    {
      categoryId: growthCategory.id,
      name: "SEO & Performance",
      slug: "seo-performance",
      tagline: "Get found, then get chosen.",
      description: "Technical SEO and Core Web Vitals work that compounds — structured data, sitemaps, caching, and content architecture done right.",
      benefits: ["Technical SEO audit included", "Structured data on every page", "Core Web Vitals monitoring", "Monthly reporting"],
      process: [
        { title: "Audit", description: "Full technical and content SEO audit against competitors." },
        { title: "Fix", description: "Implementation of structured data, sitemaps, and performance fixes." },
        { title: "Monitor", description: "Ongoing tracking of rankings and Core Web Vitals." },
        { title: "Iterate", description: "Monthly recommendations based on real search data." },
      ],
      deliverables: ["SEO audit report", "Structured data implementation", "Performance optimization", "Monthly analytics report"],
      timeline: "2 weeks + ongoing",
      techs: ["Next.js", "Vercel"],
      faqs: faqByContext("SERVICE"),
      isFeatured: false,
      pricing: pricingFor(900, "/mo"),
    },
  ];

  const services = [];
  for (const [i, s] of serviceSeed.entries()) {
    const seo = await prisma.seoMeta.create({
      data: {
        metaTitle: `${s.name} | ${AGENCY_NAME}`,
        metaDescription: s.tagline,
        keywords: [s.name.toLowerCase(), "agency", "mab digital"],
      },
    });
    const service = await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        categoryId: s.categoryId,
        name: s.name,
        slug: s.slug,
        tagline: s.tagline,
        description: s.description,
        benefits: s.benefits,
        process: s.process,
        deliverables: s.deliverables,
        timeline: s.timeline,
        status: "PUBLISHED",
        isFeatured: s.isFeatured,
        order: i,
        seoId: seo.id,
        technologies: { connect: s.techs.map((t) => ({ id: techByName(t) })) },
        faqs: { connect: s.faqs.map((f) => ({ id: f.id })) },
        pricingPlans: { create: s.pricing },
      },
    });
    services.push(service);
  }
  // related services: link web dev pair + product/growth pair
  await prisma.service.update({
    where: { id: services[0]!.id },
    data: { relatedTo: { connect: [{ id: services[1]!.id }, { id: services[2]!.id }] } },
  });

  // ---------------------------------------------------------------------
  // Portfolio
  // ---------------------------------------------------------------------
  const categorySeed = ["SaaS Platforms", "E-commerce", "Marketing Sites", "Internal Tools"];
  const projectCategories = [];
  for (const [i, name] of categorySeed.entries()) {
    projectCategories.push(
      await prisma.projectCategory.upsert({
        where: { slug: name.toLowerCase().replace(/\s+/g, "-") },
        update: {},
        create: { name, slug: name.toLowerCase().replace(/\s+/g, "-"), order: i },
      }),
    );
  }

  const projectSeed = [
    { title: "Harbor Analytics Dashboard", client: "Harbor Analytics", category: 0, summary: "A real-time analytics dashboard rebuilt from a legacy jQuery app into a modern, type-safe product.", techs: ["Next.js", "TypeScript", "PostgreSQL", "Prisma"], results: [{ label: "Load time", value: "-72%" }, { label: "Weekly active users", value: "+140%" }] },
    { title: "Northline Goods Storefront", client: "Northline Goods", category: 1, summary: "A headless commerce storefront built for a DTC furniture brand scaling past $2M ARR.", techs: ["Next.js", "React", "Tailwind CSS"], results: [{ label: "Conversion rate", value: "+38%" }, { label: "Page speed score", value: "97" }] },
    { title: "Lumen Health Marketing Site", client: "Lumen Health", category: 2, summary: "A trust-first marketing site for a digital health startup ahead of their Series A.", techs: ["Next.js", "Tailwind CSS"], results: [{ label: "Demo requests", value: "+61%" }, { label: "Bounce rate", value: "-24%" }] },
    { title: "Fieldstone Capital Investor Portal", client: "Fieldstone Capital", category: 0, summary: "A secure investor reporting portal replacing quarterly PDF emails.", techs: ["Next.js", "Node.js", "Express", "PostgreSQL"], results: [{ label: "Support tickets", value: "-55%" }, { label: "Time to report", value: "-90%" }] },
    { title: "Ondo Labs Product Site", client: "Ondo Labs", category: 2, summary: "A developer-first product site with live API playground embeds.", techs: ["Next.js", "TypeScript"], results: [{ label: "Signup rate", value: "+29%" }] },
    { title: "Ridgeway Freight Ops Console", client: "Ridgeway Freight", category: 3, summary: "An internal logistics console replacing three disconnected spreadsheets.", techs: ["Node.js", "Express", "Prisma", "PostgreSQL"], results: [{ label: "Manual data entry", value: "-80%" }, { label: "Dispatch time", value: "-35%" }] },
    { title: "Ember & Co Boutique Store", client: "Ember & Co", category: 1, summary: "A boutique fashion e-commerce experience with a custom size-matching tool.", techs: ["Next.js", "Tailwind CSS", "React"], results: [{ label: "Return rate", value: "-18%" }, { label: "AOV", value: "+22%" }] },
    { title: "Vantage Studio Portfolio Platform", client: "Vantage Studio", category: 2, summary: "A CMS-driven portfolio and case-study platform for a design studio.", techs: ["Next.js", "TypeScript", "Prisma"], results: [{ label: "Organic traffic", value: "+84%" }] },
  ];

  const projects = [];
  for (const [i, p] of projectSeed.entries()) {
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const seo = await prisma.seoMeta.create({
      data: {
        metaTitle: `${p.title} | ${AGENCY_NAME} Portfolio`,
        metaDescription: p.summary,
        keywords: [p.client.toLowerCase(), "case study", "portfolio"],
      },
    });
    const testimonial = testimonials[i % testimonials.length]!;
    const project = await prisma.project.upsert({
      where: { slug },
      update: {},
      create: {
        categoryId: projectCategories[p.category]!.id,
        title: p.title,
        slug,
        client: p.client,
        summary: p.summary,
        sections: [
          {
            id: randomUUID(),
            title: "Overview",
            content: `<p>${p.client} came to ${AGENCY_NAME} needing a partner who could move fast without breaking the parts of the product that already worked.</p>`,
            icon: "Compass",
            order: 0,
          },
          {
            id: randomUUID(),
            title: "Client Problem",
            content: `<p>${p.client}'s existing platform was slowing the team down — every new feature took weeks longer than it should have.</p>`,
            icon: "MessageSquareWarning",
            order: 1,
          },
          {
            id: randomUUID(),
            title: "Research",
            content: "<p>We ran stakeholder interviews and a technical audit of the existing stack before proposing any solution.</p>",
            icon: "Search",
            order: 2,
          },
          {
            id: randomUUID(),
            title: "Strategy",
            content:
              "<p>We prioritized a phased rebuild: ship the highest-impact screens first, migrate data incrementally, keep the lights on throughout.</p>",
            icon: "Target",
            order: 3,
          },
          {
            id: randomUUID(),
            title: "Design",
            content: "<p>A dedicated design system was built in Figma so the client's team could extend the product post-launch.</p>",
            icon: "Palette",
            order: 4,
          },
          {
            id: randomUUID(),
            title: "Development",
            content: `<p>Built on ${p.techs.join(", ")} with full type safety from database to UI.</p>`,
            icon: "Code",
            order: 5,
          },
          {
            id: randomUUID(),
            title: "Challenges",
            content: "<p>Migrating live production data without downtime while three other teams depended on the existing system.</p>",
            icon: "TrendingUp",
            order: 6,
          },
          {
            id: randomUUID(),
            title: "Results",
            content: "<p>A dual-write migration strategy let us cut over with zero downtime and a same-day rollback path.</p>",
            icon: "Trophy",
            order: 7,
          },
        ],
        results: p.results,
        liveUrl: "https://example.com",
        githubUrl: null,
        timelineStart: new Date("2025-01-01"),
        timelineEnd: new Date("2025-03-15"),
        status: "PUBLISHED",
        isFeatured: i < 3,
        order: i,
        seoId: seo.id,
        techStack: { connect: p.techs.map((t) => ({ id: techByName(t) })) },
        testimonials: { connect: { id: testimonial.id } },
      },
    });
    projects.push(project);

    const heroImage = img(`projects/${slug}/hero`, 1600, 1000, i + 1);
    const existingHero = await prisma.projectImage.findFirst({ where: { projectId: project.id } });
    if (!existingHero) {
      await prisma.projectImage.create({
        data: {
          projectId: project.id,
          url: heroImage.url,
          publicId: heroImage.publicId,
          width: heroImage.width,
          height: heroImage.height,
          order: 0,
          caption: "Project hero",
        },
      });
    }
  }
  await prisma.project.update({
    where: { id: projects[0]!.id },
    data: { relatedTo: { connect: [{ id: projects[3]!.id }, { id: projects[5]!.id }] } },
  });

  // ---------------------------------------------------------------------
  // Team / About
  // ---------------------------------------------------------------------
  const skillSeed = ["Product Strategy", "System Design", "Interface Design", "Frontend Engineering", "Backend Engineering", "DevOps"];
  const skills: Skill[] = [];
  for (const [i, name] of skillSeed.entries()) {
    skills.push(
      await prisma.skill.upsert({ where: { name }, update: {}, create: { name, proficiency: 85 + (i % 3) * 5, order: i } }),
    );
  }

  const teamSeed = [
    { name: "Amara Osei", role: "Founder & Principal Engineer", bio: "Ten years building product for startups from seed to Series C. Leads every architecture decision at MAB Digital.", skillIdx: [0, 1, 3] },
    { name: "Julian Voss", role: "Design Director", bio: "Formerly design lead at two YC-backed startups. Obsessed with type systems and restraint.", skillIdx: [0, 2] },
    { name: "Nadia Farrow", role: "Senior Backend Engineer", bio: "Databases, APIs, and the boring infrastructure that makes everything else possible.", skillIdx: [1, 4, 5] },
    { name: "Chen Liu", role: "Frontend Engineer", bio: "Ships pixel-accurate interfaces fast, and cares more about accessibility than anyone should have to.", skillIdx: [3, 2] },
  ];
  for (const [i, t] of teamSeed.entries()) {
    await prisma.teamMember.create({
      data: {
        name: t.name,
        role: t.role,
        bio: t.bio,
        order: i,
        skills: { connect: t.skillIdx.map((idx) => ({ id: skills[idx]!.id })) },
      },
    });
  }

  const coreValueSeed = [
    { title: "Craft over speed", description: "We'd rather ship a week later than ship something we're not proud of.", icon: "Gem" },
    { title: "Say the hard thing early", description: "If your idea has a flaw, you'll hear it in week one, not week ten.", icon: "MessageSquareWarning" },
    { title: "Own the outcome", description: "We measure success by your metrics, not our deliverables checklist.", icon: "Target" },
    { title: "Build for handoff", description: "Every project ends with you fully able to run without us.", icon: "Handshake" },
  ];
  for (const [i, v] of coreValueSeed.entries()) {
    await prisma.coreValue.create({ data: { ...v, order: i } });
  }

  const timelineSeed = [
    { year: "2019", title: "MAB Digital founded", description: "Started as a two-person freelance partnership building sites for local businesses." },
    { year: "2021", title: "First product build", description: "Expanded beyond marketing sites into full-stack SaaS product development." },
    { year: "2023", title: "Team of six", description: "Brought on dedicated design and backend engineering leads." },
    { year: "2025", title: "50+ projects shipped", description: "Crossed 50 shipped client projects across SaaS, e-commerce, and internal tools." },
  ];
  for (const [i, t] of timelineSeed.entries()) {
    await prisma.timelineEvent.create({ data: { ...t, order: i } });
  }

  await prisma.certification.create({ data: { name: "AWS Certified Solutions Architect", issuer: "Amazon Web Services", year: "2024", order: 0 } });
  await prisma.certification.create({ data: { name: "Certified Scrum Master", issuer: "Scrum Alliance", year: "2023", order: 1 } });

  await prisma.aboutPageContent.upsert({
    where: { id: "singleton-about" },
    update: {},
    create: {
      id: "singleton-about",
      story: `${AGENCY_NAME} started with a simple frustration: too many agencies deliver a beautiful Figma file and disappear before the hard engineering work begins. We build the whole thing — design, code, and the systems that keep it running.`,
      mission: "To give ambitious teams software that looks and performs like it was built in-house by a senior team — because it was.",
      vision: "A world where small teams can ship products with the polish of companies ten times their size.",
      philosophy: "Design and engineering are one discipline here, not a handoff between two departments.",
    },
  });

  await prisma.homePageContent.upsert({
    where: { id: "singleton-home" },
    update: {},
    create: {
      id: "singleton-home",
      heroBadgeText: "Now booking Q3 projects",
      heroHeadline: "Software that feels inevitable.",
      heroSubheadline: "MAB Digital designs and engineers premium web products for startups and teams who refuse to ship something average.",
      heroCtaLabel: "Start a project",
      heroCtaHref: "/contact",
      heroSecondaryCtaLabel: "View Our Work",
      heroSecondaryCtaHref: "/portfolio",
    },
  });

  const homeStatSeed: Array<{ title: string; number: string; suffix: string; highlightKey?: "YEARS_IN_BUSINESS" | "PROJECTS_SHIPPED" }> = [
    { title: "Projects shipped", number: "50", suffix: "+", highlightKey: "PROJECTS_SHIPPED" },
    { title: "Client retention", number: "92", suffix: "%" },
    { title: "Avg. Lighthouse score", number: "97", suffix: "" },
    { title: "Years in business", number: "6", suffix: "", highlightKey: "YEARS_IN_BUSINESS" },
  ];
  for (const [i, s] of homeStatSeed.entries()) {
    await prisma.homeStat.create({ data: { ...s, order: i } });
  }

  const homeProcessStepSeed = [
    { title: "Discovery", description: "We map your audience, competitors, and the outcome that actually matters." },
    { title: "Design", description: "Wireframes, then high-fidelity screens in a system built for your brand." },
    { title: "Build", description: "Type-safe, tested implementation — weekly demos against real staging data." },
    { title: "Launch & support", description: "QA, performance pass, guided handoff, and a 30-day warranty period." },
  ];
  for (const [i, s] of homeProcessStepSeed.entries()) {
    await prisma.homeProcessStep.create({ data: { ...s, order: i } });
  }

  const homeWhyReasonSeed = [
    { title: "Craft over speed", description: "We'd rather ship a week later than ship something we're not proud of.", icon: "Gem" },
    { title: "Say the hard thing early", description: "If your idea has a flaw, you'll hear it in week one, not week ten.", icon: "MessageSquareWarning" },
    { title: "Own the outcome", description: "We measure success by your metrics, not our deliverables checklist.", icon: "Target" },
    { title: "Build for handoff", description: "Every project ends with you fully able to run without us.", icon: "Handshake" },
  ];
  for (const [i, r] of homeWhyReasonSeed.entries()) {
    await prisma.homeWhyReason.create({ data: { ...r, order: i } });
  }

  // ---------------------------------------------------------------------
  // Affiliate tools
  // ---------------------------------------------------------------------
  const affiliateSeed: Array<{ slug: string; name: string; tools: Array<{ name: string; description: string; benefits: string[]; specialOffer?: string; ctaUrl: string }> }> = [
    { slug: "hosting", name: "Hosting", tools: [
      { name: "Vercel", description: "The platform MAB Digital deploys every Next.js project to.", benefits: ["Zero-config deploys", "Global edge network", "Preview URLs per PR"], ctaUrl: "https://vercel.com" },
      { name: "Railway", description: "Simple infrastructure hosting for databases and backend services.", benefits: ["One-click Postgres", "Usage-based pricing"], ctaUrl: "https://railway.app" },
    ]},
    { slug: "domains", name: "Domains", tools: [
      { name: "Namecheap", description: "Our default registrar for client domains — reliable and affordable.", benefits: ["Free WHOIS privacy", "Simple DNS management"], specialOffer: "10% off first purchase", ctaUrl: "https://namecheap.com" },
    ]},
    { slug: "email", name: "Email", tools: [
      { name: "Resend", description: "Developer-first transactional email, built by the team behind React Email.", benefits: ["React-based templates", "Generous free tier"], ctaUrl: "https://resend.com" },
    ]},
    { slug: "development", name: "Development", tools: [
      { name: "GitHub", description: "Where every MAB Digital project lives, from day one commit to production.", benefits: ["Free private repos", "Actions CI/CD"], ctaUrl: "https://github.com" },
      { name: "Supabase", description: "Postgres, auth, and storage in one box for projects that don't need a custom backend.", benefits: ["Generous free tier", "Realtime subscriptions"], ctaUrl: "https://supabase.com" },
    ]},
    { slug: "design", name: "Design", tools: [
      { name: "Figma", description: "The design tool every MAB Digital project is designed in, and handed off from.", benefits: ["Free for small teams", "Dev Mode handoff"], ctaUrl: "https://figma.com" },
    ]},
    { slug: "ai", name: "AI", tools: [
      { name: "Claude", description: "The AI assistant we use for everything from code review to content drafts.", benefits: ["Best-in-class coding assistant", "Long context windows"], ctaUrl: "https://claude.com" },
    ]},
    { slug: "productivity", name: "Productivity", tools: [
      { name: "Linear", description: "Issue tracking that doesn't get in the way of actually shipping.", benefits: ["Fast, keyboard-first UI", "Clean roadmap views"], ctaUrl: "https://linear.app" },
      { name: "Notion", description: "Where we keep client docs, specs, and meeting notes in one place.", benefits: ["Flexible docs + wikis", "Great free tier"], ctaUrl: "https://notion.so" },
    ]},
  ];

  for (const [ci, cat] of affiliateSeed.entries()) {
    const category = await prisma.affiliateCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { slug: cat.slug, name: cat.name, order: ci },
    });
    for (const [ti, tool] of cat.tools.entries()) {
      await prisma.affiliateTool.upsert({
        where: { slug: tool.name.toLowerCase().replace(/\s+/g, "-") },
        update: {},
        create: {
          categoryId: category.id,
          name: tool.name,
          slug: tool.name.toLowerCase().replace(/\s+/g, "-"),
          description: tool.description,
          benefits: tool.benefits,
          specialOffer: tool.specialOffer,
          ctaUrl: tool.ctaUrl,
          order: ti,
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  const headerNav = [
    { label: "Services", href: "/services" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "About", href: "/about" },
    { label: "Affiliate Tools", href: "/affiliate-tools" },
    { label: "Contact", href: "/contact" },
  ];
  for (const [i, n] of headerNav.entries()) {
    await prisma.navItem.create({ data: { ...n, location: "HEADER", order: i } });
  }
  const footerNav = [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ];
  for (const [i, n] of footerNav.entries()) {
    await prisma.navItem.create({ data: { ...n, location: "FOOTER", order: i } });
  }

  // ---------------------------------------------------------------------
  // Site settings
  // ---------------------------------------------------------------------
  const settings: Array<{ key: string; value: Prisma.InputJsonValue }> = [
    { key: "company_name", value: AGENCY_NAME },
    { key: "contact_email", value: "hello@mabdigital.com" },
    { key: "contact_phone", value: "+1 (555) 010-2938" },
    { key: "whatsapp_number", value: "+15550102938" },
    { key: "address", value: "148 Merchant Street, Suite 400, Austin, TX 78701" },
    { key: "business_hours", value: { mon_fri: "9:00 AM – 6:00 PM CT", sat_sun: "Closed" } },
    {
      key: "socials",
      value: {
        x: "https://x.com/mabdigital",
        linkedin: "https://linkedin.com/company/mabdigital",
        github: "https://github.com/mabdigital",
        instagram: "https://instagram.com/mabdigital",
        facebook: "https://facebook.com/mabdigital",
        youtube: "https://youtube.com/@mabdigital",
      },
    },
    { key: "calendly_url", value: "https://calendly.com/mab-digital/intro-call" },
    { key: "google_maps_embed", value: "https://www.google.com/maps/embed?pb=placeholder" },
    { key: "google_maps_embed_code", value: "" },
    { key: "currency", value: "PKR" },
    { key: "branding", value: { brandName: AGENCY_NAME, logoMediaId: null, logoUrl: null, displayMode: "TEXT" } },
  ];
  for (const s of settings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
