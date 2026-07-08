// Minimal, type-valid "empty" content for the singleton page-content models.
// Used only when the API is unreachable at build/revalidate time -- real
// content always wins once the API responds again.
import type { AboutContentRead, HomeContentRead, PaginatedResponse } from "./types";

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
  seo: null,
};

export const EMPTY_ABOUT_CONTENT: AboutContentRead = {
  story: "Our story is temporarily unavailable.",
  mission: "",
  vision: "",
  philosophy: "",
  seo: null,
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
