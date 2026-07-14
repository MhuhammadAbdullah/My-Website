import { PrismaClient } from "../generated/client/index.js";

const prisma = new PrismaClient();

// One-off backfill for the new CMS-managed heading/paragraph fields added
// across HomePageContent, AboutPageContent, and the four new page-content
// singletons (Services/Portfolio/Affiliate Tools/Contact) plus the two new
// SiteSetting keys (default_cta, faq_section_heading). Seeds each with the
// exact copy that was previously hardcoded in the frontend, so nothing
// visibly changes on the public site after this runs. Idempotent -- only
// fills fields that are currently null/missing, never overwrites existing
// (possibly already-edited) content.

const HOME_DEFAULTS = {
  storyHeading: "**Design and engineering** — one discipline, not a handoff.",
  storyButtonLabel: "More about us",
  storyMissionLabel: "Our mission",
  servicesHeading: "What we **build**",
  servicesDescription:
    "From marketing sites to full product builds — scoped, priced, and delivered on a real timeline.",
  servicesButtonLabel: "All services",
  portfolioHeading: "Recent **work**",
  portfolioDescription: "A handful of the products we've designed, built, and shipped to production.",
  portfolioButtonLabel: "Full portfolio",
  processHeading: "How we **work**",
  technologiesHeading: "The **stack** behind the work",
  whyHeading: "Why work with **us**",
  testimonialsHeading: "What clients **say**",
};

const ABOUT_DEFAULTS = {
  heroHeading: "Our **story**, in plain terms.",
  missionLabel: "Mission",
  visionLabel: "Vision",
  philosophyLabel: "Philosophy",
  valuesHeading: "Core **values**",
  timelineHeading: "Our **timeline**",
  teamHeading: "Meet the **team**",
  skillsHeading: "Skills",
  certificationsHeading: "Certifications",
  technologiesHeading: "The **stack** behind the work",
};

async function backfillHome() {
  const existing = await prisma.homePageContent.findFirst();
  if (!existing) {
    console.log("No HomePageContent row yet — skipping (will be created with defaults on first admin save).");
    return;
  }
  const patch = Object.fromEntries(
    Object.entries(HOME_DEFAULTS).filter(([key]) => (existing as Record<string, unknown>)[key] == null),
  );
  if (Object.keys(patch).length === 0) {
    console.log("HomePageContent: nothing to backfill.");
    return;
  }
  await prisma.homePageContent.update({ where: { id: existing.id }, data: patch });
  console.log(`HomePageContent: backfilled ${Object.keys(patch).length} field(s).`);
}

async function backfillAbout() {
  const existing = await prisma.aboutPageContent.findFirst();
  if (!existing) {
    console.log("No AboutPageContent row yet — skipping (will be created with defaults on first admin save).");
    return;
  }
  const patch = Object.fromEntries(
    Object.entries(ABOUT_DEFAULTS).filter(([key]) => (existing as Record<string, unknown>)[key] == null),
  );
  if (Object.keys(patch).length === 0) {
    console.log("AboutPageContent: nothing to backfill.");
    return;
  }
  await prisma.aboutPageContent.update({ where: { id: existing.id }, data: patch });
  console.log(`AboutPageContent: backfilled ${Object.keys(patch).length} field(s).`);
}

async function ensureSingleton<T extends { id: string }>(
  label: string,
  find: () => Promise<T | null>,
  create: () => Promise<T>,
) {
  const existing = await find();
  if (existing) {
    console.log(`${label}: already has a row, skipping.`);
    return;
  }
  await create();
  console.log(`${label}: created initial row.`);
}

async function backfillNewPages() {
  await ensureSingleton(
    "ServicesPageContent",
    () => prisma.servicesPageContent.findFirst(),
    () =>
      prisma.servicesPageContent.create({
        data: {
          heroHeading: "Services built to **ship**, not just to pitch.",
          heroDescription:
            "Every engagement is scoped, fixed-price by default, and comes with an admin panel so you can keep it running long after we hand it off.",
        },
      }),
  );

  await ensureSingleton(
    "PortfolioPageContent",
    () => prisma.portfolioPageContent.findFirst(),
    () =>
      prisma.portfolioPageContent.create({
        data: {
          heroHeading: "Work we're **proud** to put our name on.",
          heroDescription:
            "Every case study below includes the problem, the process, and the measurable result — not just pretty screenshots.",
        },
      }),
  );

  await ensureSingleton(
    "AffiliateToolsPageContent",
    () => prisma.affiliateToolsPageContent.findFirst(),
    () =>
      prisma.affiliateToolsPageContent.create({
        data: {
          heroHeading: "Tools we **actually** use.",
          heroDescription:
            "Every product below is something we run our own business and client projects on — not a rented banner ad.",
          disclosureText:
            "some links below are affiliate links. If you sign up through them, we may earn a commission at no additional cost to you — and in several cases our partners extend an exclusive discount to our visitors, called out on each card.",
        },
      }),
  );

  await ensureSingleton(
    "ContactPageContent",
    () => prisma.contactPageContent.findFirst(),
    () =>
      prisma.contactPageContent.create({
        data: {
          heroHeading: "Let's build something **worth talking about**.",
          heroDescription: "Fill out the form, or reach us directly — most people hear back within one business day.",
        },
      }),
  );
}

async function backfillSettings() {
  const defaultCta = await prisma.siteSetting.findUnique({ where: { key: "default_cta" } });
  if (!defaultCta) {
    await prisma.siteSetting.create({
      data: {
        key: "default_cta",
        value: {
          headline: "Ready to build something **inevitable**?",
          subheadline: "Tell us about your project — most people hear back from us within one business day.",
          ctaLabel: "Start a project",
          ctaHref: "/contact",
        },
      },
    });
    console.log("SiteSetting[default_cta]: created.");
  } else {
    console.log("SiteSetting[default_cta]: already exists, skipping.");
  }

  const faqHeading = await prisma.siteSetting.findUnique({ where: { key: "faq_section_heading" } });
  if (!faqHeading) {
    await prisma.siteSetting.create({
      data: { key: "faq_section_heading", value: "Frequently asked questions" },
    });
    console.log("SiteSetting[faq_section_heading]: created.");
  } else {
    console.log("SiteSetting[faq_section_heading]: already exists, skipping.");
  }
}

async function main() {
  await backfillHome();
  await backfillAbout();
  await backfillNewPages();
  await backfillSettings();
  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
