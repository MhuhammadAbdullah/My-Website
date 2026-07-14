// Minimal, type-valid "empty" content for the singleton page-content models.
// Used only when the API is unreachable at build/revalidate time -- real
// content always wins once the API responds again.
import type {
  AboutContentRead,
  AffiliateToolsPageContentRead,
  ContactPageContentRead,
  HomeContentRead,
  PaginatedResponse,
  PortfolioPageContentRead,
  ServicesPageContentRead,
} from "./types";

export const EMPTY_HOME_CONTENT: HomeContentRead = {
  heroBadgeText: null,
  heroHeadline: "Premium web design & engineering.",
  heroSubheadline: "We're updating this page — please check back shortly.",
  heroDescription: null,
  heroBackgroundImage: null,
  heroCtaLabel: "Get in touch",
  heroCtaHref: "/contact",
  heroCtaNewTab: false,
  heroSecondaryCtaEnabled: false,
  heroSecondaryCtaLabel: null,
  heroSecondaryCtaHref: null,
  heroSecondaryCtaNewTab: false,
  contactCtaHeading: null,
  contactCtaDescription: null,
  contactCtaButtonText: null,
  contactCtaButtonHref: null,
  storyHeading: null,
  storyButtonLabel: null,
  storyMissionLabel: null,
  servicesHeading: null,
  servicesDescription: null,
  servicesButtonLabel: null,
  portfolioHeading: null,
  portfolioDescription: null,
  portfolioButtonLabel: null,
  processHeading: null,
  technologiesHeading: null,
  whyHeading: null,
  testimonialsHeading: null,
  seo: null,
};

export const EMPTY_ABOUT_CONTENT: AboutContentRead = {
  story: "Our story is temporarily unavailable.",
  mission: "",
  vision: "",
  philosophy: "",
  heroHeading: null,
  missionLabel: null,
  visionLabel: null,
  philosophyLabel: null,
  valuesHeading: null,
  timelineHeading: null,
  teamHeading: null,
  skillsHeading: null,
  certificationsHeading: null,
  technologiesHeading: null,
  seo: null,
};

export const EMPTY_SERVICES_PAGE_CONTENT: ServicesPageContentRead = {
  heroHeading: "Services built to **ship**, not just to pitch.",
  heroDescription: "We're updating this page — please check back shortly.",
};

export const EMPTY_PORTFOLIO_PAGE_CONTENT: PortfolioPageContentRead = {
  heroHeading: "Work we're **proud** to put our name on.",
  heroDescription: "We're updating this page — please check back shortly.",
};

export const EMPTY_AFFILIATE_TOOLS_PAGE_CONTENT: AffiliateToolsPageContentRead = {
  heroHeading: "Tools we **actually** use.",
  heroDescription: "We're updating this page — please check back shortly.",
  disclosureText:
    "some links below are affiliate links. If you sign up through them, we may earn a commission at no additional cost to you.",
};

export const EMPTY_CONTACT_PAGE_CONTENT: ContactPageContentRead = {
  heroHeading: "Let's build something **worth talking about**.",
  heroDescription: "We're updating this page — please check back shortly.",
  whatsappLabel: "Chat on WhatsApp",
  calendlyLabel: "Book an intro call",
};

export const EMPTY_ABOUT_TEAM_DATA = {
  team: [],
  values: [],
  timeline: [],
  certifications: [],
};

export function emptyPage<T>(page: number, pageSize: number): PaginatedResponse<T> {
  return { items: [], total: 0, page, pageSize, totalPages: 0 };
}
