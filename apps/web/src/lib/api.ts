import { env } from "./env";
import type {
  AboutContentRead,
  AffiliateCategoryRead,
  AffiliateToolRead,
  AffiliateToolsPageContentRead,
  ContactPageContentRead,
  FaqRead,
  HomeContentRead,
  HomeProcessStepRead,
  HomeStatRead,
  HomeWhyReasonRead,
  LegalPageContentRead,
  NavItemRead,
  PageSeoRead,
  PaginatedResponse,
  PortfolioPageContentRead,
  ProjectDetail,
  ProjectListItem,
  ServiceDetail,
  ServiceListItem,
  ServicesPageContentRead,
  SiteSettings,
  SkillRead,
  TeamMemberRead,
  TechnologyRead,
  TestimonialRead,
} from "./types";

// A hung request (e.g. a cold-starting backend) would otherwise block static
// generation indefinitely instead of failing fast enough for callers'
// withFallback() wrappers to kick in.
const API_TIMEOUT_MS = 10_000;

async function apiFetch<T>(path: string, init?: RequestInit & { next?: NextFetchRequestConfig }): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
    ...init,
  });

  if (!res.ok) {
    throw new Error(`API request to ${path} failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const getServices = () => apiFetch<{ items: ServiceListItem[] }>("/services").then((r) => r.items);

export const getService = (slug: string) =>
  apiFetch<{ item: ServiceDetail }>(`/services/${slug}`).then((r) => r.item);

export const getProjects = (params: { page?: number; pageSize?: number; category?: string; search?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  return apiFetch<PaginatedResponse<ProjectListItem>>(`/projects?${query.toString()}`);
};

export const getProject = (slug: string) =>
  apiFetch<{ item: ProjectDetail }>(`/projects/${slug}`).then((r) => r.item);

export const getProjectCategories = () =>
  apiFetch<{ items: { id: string; name: string; slug: string }[] }>("/categories/projects").then((r) => r.items);

export const getTestimonials = () =>
  apiFetch<{ items: TestimonialRead[] }>("/testimonials").then((r) => r.items);

export const getFaqs = (context?: string) =>
  apiFetch<{ items: FaqRead[] }>("/faqs").then((r) =>
    context ? r.items.filter((f) => f.context === context) : r.items,
  );

export const getTeam = () => apiFetch<{ items: TeamMemberRead[] }>("/team").then((r) => r.items);

export const getSkills = () => apiFetch<{ items: SkillRead[] }>("/skills").then((r) => r.items);

export const getTechnologies = () =>
  apiFetch<{ items: TechnologyRead[] }>("/categories/technologies").then((r) => r.items);

export const getAboutTeamData = () =>
  apiFetch<{
    team: TeamMemberRead[];
    values: { id: string; title: string; description: string; icon: string }[];
    timeline: { id: string; year: string; title: string; description: string }[];
    certifications: { id: string; name: string; issuer: string; year: string; url: string | null }[];
  }>("/pages/about/team");

export const getAffiliateCategories = () =>
  apiFetch<{ items: AffiliateCategoryRead[] }>("/affiliate/categories").then((r) => r.items);

export const getAffiliateTools = (
  params: {
    page?: number;
    pageSize?: number;
    category?: string;
    search?: string;
    featured?: boolean;
    sortBy?: "order" | "name" | "createdAt";
    sortOrder?: "asc" | "desc";
  } = {},
) => {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.featured !== undefined) query.set("featured", String(params.featured));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return apiFetch<PaginatedResponse<AffiliateToolRead>>(`/affiliate/tools?${query.toString()}`);
};

export const getHomeContent = () => apiFetch<{ item: HomeContentRead }>("/pages/home").then((r) => r.item);

export const getHomeStats = () => apiFetch<{ items: HomeStatRead[] }>("/home-stats").then((r) => r.items);

export const getHomeProcessSteps = () =>
  apiFetch<{ items: HomeProcessStepRead[] }>("/home-process-steps").then((r) => r.items);

export const getHomeWhyReasons = () =>
  apiFetch<{ items: HomeWhyReasonRead[] }>("/home-why-reasons").then((r) => r.items);

export const getPageSeo = (page: "services" | "portfolio" | "affiliate-tools" | "contact") =>
  apiFetch<{ item: PageSeoRead | null }>(`/page-seo/${page}`).then((r) => r.item);

export const getAboutContent = () => apiFetch<{ item: AboutContentRead }>("/pages/about").then((r) => r.item);

export const getServicesPageContent = () =>
  apiFetch<{ item: ServicesPageContentRead | null }>("/pages/services").then((r) => r.item);

export const getPortfolioPageContent = () =>
  apiFetch<{ item: PortfolioPageContentRead | null }>("/pages/portfolio").then((r) => r.item);

export const getAffiliateToolsPageContent = () =>
  apiFetch<{ item: AffiliateToolsPageContentRead | null }>("/pages/affiliate-tools").then((r) => r.item);

export const getContactPageContent = () =>
  apiFetch<{ item: ContactPageContentRead | null }>("/pages/contact").then((r) => r.item);

// `item` is null whenever the page has never been published -- callers use
// withFallback()/EMPTY_PRIVACY_POLICY_CONTENT (or EMPTY_TERMS_CONTENT) the
// same way every other content type degrades on a fetch failure.
export const getPrivacyPolicyContent = () =>
  apiFetch<{ item: LegalPageContentRead | null }>("/pages/privacy-policy").then((r) => r.item);

export const getTermsContent = () => apiFetch<{ item: LegalPageContentRead | null }>("/pages/terms").then((r) => r.item);

export const getSettings = () => apiFetch<{ settings: SiteSettings }>("/settings").then((r) => r.settings);

export const getNav = (location: "HEADER" | "FOOTER") =>
  apiFetch<{ items: NavItemRead[] }>("/navigation").then((r) => r.items.filter((n) => n.location === location));

export async function submitContactForm(data: {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  budget?: string;
  message: string;
  source?: string;
}) {
  let res: Response;
  try {
    res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Something went wrong" }));
    const fieldErrors = body?.issues?.fieldErrors as Record<string, string[]> | undefined;
    const firstFieldError = fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
    throw new Error(firstFieldError ?? body.error ?? "Something went wrong");
  }
  return res.json();
}
