"use client";

import * as React from "react";
import { Suspense } from "react";
import { ChevronDown, Plus, Trash2, Pencil, X } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  FieldError,
  Heading,
  Input,
  Label,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@agency/ui";
import { CURRENCY_OPTIONS, type ServiceDetailSections } from "@agency/types";
import { useOpenOnNew } from "@/lib/use-open-on-new";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { PageHeroContentForm } from "@/components/page-hero-content-form";
import { ServicesPageSettingsForm } from "@/components/services-page-settings-form";

const billingTypeOptions = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "HOURLY", label: "Hourly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
];

interface Category {
  id: string;
  name: string;
}
interface Technology {
  id: string;
  name: string;
}
interface PricingPlanForm {
  id?: string;
  name: string;
  regularPrice: string;
  discountPrice: string;
  billingType: string;
  priceLabel: string;
  currency: string;
  features: string;
  isFeatured: boolean;
  isCustomQuote: boolean;
  ctaLabel: string;
  ctaHref: string;
}
interface ProcessStepForm {
  title: string;
  description: string;
}

function splitServiceCopy(value: string) {
  const match = value.match(/^(.+?)\s+[\u2014\u2013]\s+(.+)$/);
  return match ? { title: match[1] ?? value, description: match[2] ?? "" } : { title: value, description: "" };
}

interface ServicePricingPlan {
  id: string;
  name: string;
  regularPrice: number | null;
  discountPrice: number | null;
  billingType: string;
  priceLabel: string | null;
  currency: string | null;
  features: string[];
  isFeatured: boolean;
  isCustomQuote: boolean;
  ctaLabel: string;
  ctaHref: string;
  order: number;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  categoryId: string | null;
  category: Category | null;
  benefits: string[];
  deliverables: string[];
  timeline: string;
  technologies: Technology[];
  process: { title: string; description: string }[];
  pricingPlans: ServicePricingPlan[];
  detailSections?: ServiceDetailSections | null;
}

const emptyPlan = (): PricingPlanForm => ({
  name: "",
  regularPrice: "",
  discountPrice: "",
  billingType: "ONE_TIME",
  priceLabel: "",
  currency: "",
  features: "",
  isFeatured: false,
  isCustomQuote: false,
  ctaLabel: "Get Started",
  ctaHref: "/contact",
});

function toFormPlan(p: ServicePricingPlan): PricingPlanForm {
  return {
    id: p.id,
    name: p.name,
    regularPrice: p.regularPrice != null ? String(p.regularPrice) : "",
    discountPrice: p.discountPrice != null ? String(p.discountPrice) : "",
    billingType: p.billingType,
    priceLabel: p.priceLabel ?? "",
    currency: p.currency ?? "",
    features: p.features.join("\n"),
    isFeatured: p.isFeatured,
    isCustomQuote: p.isCustomQuote,
    ctaLabel: p.ctaLabel,
    ctaHref: p.ctaHref,
  };
}

function ServiceEditor({
  service,
  categories,
  technologies,
  onClose,
  onSaved,
}: {
  service: Service | null;
  categories: Category[];
  technologies: Technology[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({
    name: service?.name ?? "",
    slug: service?.slug ?? "",
    tagline: service?.tagline ?? "",
    description: service?.description ?? "",
    categoryId: service?.categoryId ?? "",
    status: service?.status ?? "DRAFT",
    isFeatured: service?.isFeatured ?? false,
    deliverables: service?.deliverables.join("\n") ?? "",
    timeline: service?.timeline ?? "",
    technologyIds: service?.technologies.map((t) => t.id) ?? [],
    metaTitle: service?.name ?? "",
    metaDescription: service?.tagline ?? "",
  });
  const [process, setProcess] = React.useState<ProcessStepForm[]>(() =>
    service?.process.length
      ? service.process.map((p) => ({ title: p.title, description: p.description }))
      : [{ title: "", description: "" }],
  );
  const [plans, setPlans] = React.useState<PricingPlanForm[]>(() =>
    service?.pricingPlans.length
      ? service.pricingPlans
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(toFormPlan)
      : [],
  );
  const [detailSections, setDetailSections] = React.useState<ServiceDetailSections>(() => ({
    overviewHeading: service?.detailSections?.overviewHeading ?? "",
    overviewDescription: service?.detailSections?.overviewDescription ?? service?.description ?? "",
    overviewCards: service?.detailSections?.overviewCards ?? service?.benefits.slice(0, 2).map(splitServiceCopy) ?? [],
    benefitsHeading: service?.detailSections?.benefitsHeading ?? "",
    benefitsDescription: service?.detailSections?.benefitsDescription ?? "",
    benefitItems: service?.detailSections?.benefitItems ?? service?.benefits.map(splitServiceCopy) ?? [],
    deliverableItems: service?.detailSections?.deliverableItems ?? service?.deliverables.map(splitServiceCopy) ?? [],
    scopeHeading: service?.detailSections?.scopeHeading ?? "",
    scopeDescription: service?.detailSections?.scopeDescription ?? "",
    scopeItems: service?.detailSections?.scopeItems ?? [],
    processHeading: service?.detailSections?.processHeading ?? "",
    processDescription: service?.detailSections?.processDescription ?? "",
    deliverablesHeading: service?.detailSections?.deliverablesHeading ?? "",
    deliverablesDescription: service?.detailSections?.deliverablesDescription ?? "",
    pricingHeading: service?.detailSections?.pricingHeading ?? "",
    pricingDescription: service?.detailSections?.pricingDescription ?? "",
    reviewsHeading: service?.detailSections?.reviewsHeading ?? "",
    reviewsDescription: service?.detailSections?.reviewsDescription ?? "",
    ctaHeading: service?.detailSections?.ctaHeading ?? "Your next chapter starts with a better service.",
    ctaDescription: service?.detailSections?.ctaDescription ?? "Tell us about your project and we’ll help you plan the right next step.",
    ctaButtonLabel: service?.detailSections?.ctaButtonLabel ?? "Tell us about your project",
    ctaButtonHref: service?.detailSections?.ctaButtonHref ?? "/contact",
  }));
  const [saving, setSaving] = React.useState(false);
  const [planErrors, setPlanErrors] = React.useState<Record<number, Record<string, string>>>({});

  function validatePlans() {
    const nextErrors: Record<number, Record<string, string>> = {};
    plans.forEach((plan, i) => {
      const errs: Record<string, string> = {};
      if (!plan.name.trim()) {
        errs.name = "Plan name is required.";
      }
      if (!plan.isCustomQuote) {
        const regular = Number.parseFloat(plan.regularPrice);
        if (!plan.regularPrice.trim() || Number.isNaN(regular) || regular <= 0) {
          errs.regularPrice = "Regular price is required unless this is a custom quote plan.";
        }
        if (plan.discountPrice.trim()) {
          const discount = Number.parseFloat(plan.discountPrice);
          if (Number.isNaN(discount) || discount <= 0) {
            errs.discountPrice = "Discount price must be a positive number.";
          } else if (!Number.isNaN(regular) && discount >= regular) {
            errs.discountPrice = "Discount price must be less than the regular price.";
          }
        }
      } else if (plan.discountPrice.trim()) {
        errs.discountPrice = "Custom quote plans cannot have a discount price.";
      }
      if (Object.keys(errs).length > 0) nextErrors[i] = errs;
    });
    return nextErrors;
  }

  async function handleSave() {
    const nextPlanErrors = validatePlans();
    if (Object.keys(nextPlanErrors).length > 0) {
      setPlanErrors(nextPlanErrors);
      toast.error("Please fix the highlighted pricing plan fields.");
      return;
    }
    setPlanErrors({});

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        tagline: form.tagline,
        description: form.description,
        categoryId: form.categoryId || null,
        status: form.status,
        isFeatured: form.isFeatured,
        benefits: (detailSections.benefitItems ?? [])
          .filter((item) => item.title.trim())
          .map((item) => item.description?.trim() ? `${item.title.trim()} — ${item.description.trim()}` : item.title.trim()),
        deliverables: (detailSections.deliverableItems ?? [])
          .filter((item) => item.title.trim())
          .map((item) => item.description?.trim() ? `${item.title.trim()} — ${item.description.trim()}` : item.title.trim()),
        timeline: form.timeline,
        technologyIds: form.technologyIds,
        process: process.filter((p) => p.title.trim()),
        faqIds: [],
        relatedServiceIds: [],
        pricingPlans: plans
          .filter((p) => p.name.trim())
          .map((p, i) => ({
            ...(p.id ? { id: p.id } : {}),
            name: p.name,
            regularPrice: p.isCustomQuote ? null : p.regularPrice.trim() ? Number.parseFloat(p.regularPrice) : null,
            discountPrice: p.isCustomQuote ? null : p.discountPrice.trim() ? Number.parseFloat(p.discountPrice) : null,
            billingType: p.billingType,
            priceLabel: p.priceLabel.trim() || null,
            currency: p.currency || null,
            features: p.features.split("\n").map((f) => f.trim()).filter(Boolean),
            isFeatured: p.isFeatured,
            isCustomQuote: p.isCustomQuote,
            ctaLabel: p.ctaLabel,
            ctaHref: p.ctaHref,
            order: i,
          })),
        detailSections: {
          ...detailSections,
          overviewCards: (detailSections.overviewCards ?? []).filter((item) => item.title.trim() && item.description.trim()),
          benefitItems: (detailSections.benefitItems ?? []).filter((item) => item.title.trim()),
          deliverableItems: (detailSections.deliverableItems ?? []).filter((item) => item.title.trim()),
          scopeItems: (detailSections.scopeItems ?? []).filter((item) => item.title.trim() && item.description.trim()),
        },
        seo: { metaTitle: form.metaTitle || form.name, metaDescription: form.metaDescription || form.tagline, keywords: [] },
      };

      if (service) {
        await request(`/services/${service.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await request("/services", { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success("Service saved");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[96vw] max-w-[90rem] flex-col gap-0 overflow-hidden p-0 sm:h-auto">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 bg-background px-5 py-4 pr-14 sm:px-7 sm:pr-14">
          <DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle>
          <p className="mt-1 text-body-sm text-neutral-500">Manage the service details, page sections, process and pricing in one place.</p>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <div>
              <h3 className="font-heading text-h4 font-bold text-heading">Service details</h3>
              <p className="mt-1 text-body-sm text-neutral-500">Core information used across the service page and listings.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
              <div><Label>Tagline</Label><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Service["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Timeline</Label><Input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} placeholder="4–6 weeks" /></div>
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox checked={form.isFeatured} onCheckedChange={(c) => setForm({ ...form, isFeatured: c === true })} />
              <Label className="mb-0">Featured service</Label>
            </div>
            <div>
              <Label>Technologies used</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between gap-3 font-normal">
                    <span className="truncate text-left">
                      {form.technologyIds.length > 0 ? `Select technologies (${form.technologyIds.length} selected)` : "Select technologies"}
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-neutral-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
                  {technologies.map((tech) => {
                    const active = form.technologyIds.includes(tech.id);
                    return (
                      <DropdownMenuCheckboxItem
                        key={tech.id}
                        checked={active}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) => setForm({
                          ...form,
                          technologyIds: checked
                            ? [...form.technologyIds, tech.id]
                            : form.technologyIds.filter((id) => id !== tech.id),
                        })}
                      >
                        {tech.name}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              {form.technologyIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {technologies.filter((tech) => form.technologyIds.includes(tech.id)).map((tech) => (
                    <Badge key={tech.id} variant="accent" className="inline-flex items-center gap-1.5">
                      {tech.name}
                      <button
                        type="button"
                        aria-label={`Remove ${tech.name}`}
                        onClick={() => setForm({ ...form, technologyIds: form.technologyIds.filter((id) => id !== tech.id) })}
                        className="rounded-full outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent-700"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="font-heading text-h4 font-bold text-heading">Service page sections</h3>
              <p className="mt-1 text-body-sm text-neutral-500">Manage each section in page order. Each tab contains its heading, intro text and section content.</p>
            </div>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="benefits">Benefits</TabsTrigger>
                <TabsTrigger value="process">Process</TabsTrigger>
                <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0">
                <section className="space-y-5 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Section heading</Label><Input value={detailSections.overviewHeading ?? ""} onChange={(e) => setDetailSections({ ...detailSections, overviewHeading: e.target.value })} /></div>
                    <div><Label>Section text</Label><Textarea rows={2} value={detailSections.overviewDescription ?? ""} onChange={(e) => setDetailSections({ ...detailSections, overviewDescription: e.target.value })} /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div><Label className="mb-0">Overview cards</Label><p className="mt-1 text-body-sm text-neutral-500">Add the cards shown in this section.</p></div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDetailSections({ ...detailSections, overviewCards: [...(detailSections.overviewCards ?? []), { title: "", description: "" }] })}><Plus className="size-4" /> Add card</Button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {(detailSections.overviewCards ?? []).map((card, i) => (
                        <div key={i} className="space-y-2 rounded-lg border border-neutral-200 bg-surface p-3">
                          <div className="flex items-center gap-2">
                            <Input placeholder="Card heading" value={card.title} onChange={(e) => setDetailSections({ ...detailSections, overviewCards: (detailSections.overviewCards ?? []).map((entry, index) => index === i ? { ...entry, title: e.target.value } : entry) })} />
                            <Button type="button" variant="ghost" size="icon" aria-label="Remove overview card" onClick={() => setDetailSections({ ...detailSections, overviewCards: (detailSections.overviewCards ?? []).filter((_, index) => index !== i) })}><Trash2 className="size-4 text-error-500" /></Button>
                          </div>
                          <Textarea rows={2} placeholder="Card text" value={card.description} onChange={(e) => setDetailSections({ ...detailSections, overviewCards: (detailSections.overviewCards ?? []).map((entry, index) => index === i ? { ...entry, description: e.target.value } : entry) })} />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="benefits" className="mt-0">
                <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Section heading</Label><Input value={detailSections.benefitsHeading ?? ""} onChange={(e) => setDetailSections({ ...detailSections, benefitsHeading: e.target.value })} /></div>
                    <div><Label>Section text</Label><Textarea rows={2} value={detailSections.benefitsDescription ?? ""} onChange={(e) => setDetailSections({ ...detailSections, benefitsDescription: e.target.value })} /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div><Label className="mb-0">Benefit cards</Label><p className="mt-1 text-body-sm text-neutral-500">Each card controls one expandable item in the Benefits accordion.</p></div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDetailSections({ ...detailSections, benefitItems: [...(detailSections.benefitItems ?? []), { title: "", description: "" }] })}><Plus className="size-4" /> Add benefit</Button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {(detailSections.benefitItems ?? []).map((item, i) => (
                        <div key={i} className="grid gap-2 rounded-lg border border-neutral-200 bg-surface p-3">
                          <div className="flex items-center gap-2"><Input placeholder="Benefit heading" value={item.title} onChange={(e) => setDetailSections({ ...detailSections, benefitItems: (detailSections.benefitItems ?? []).map((entry, index) => index === i ? { ...entry, title: e.target.value } : entry) })} /><Button type="button" variant="ghost" size="icon" aria-label="Remove benefit" onClick={() => setDetailSections({ ...detailSections, benefitItems: (detailSections.benefitItems ?? []).filter((_, index) => index !== i) })}><Trash2 className="size-4 text-error-500" /></Button></div>
                          <Textarea rows={2} placeholder="Benefit text" value={item.description ?? ""} onChange={(e) => setDetailSections({ ...detailSections, benefitItems: (detailSections.benefitItems ?? []).map((entry, index) => index === i ? { ...entry, description: e.target.value } : entry) })} />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="process" className="mt-0">
                <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Section heading</Label><Input value={detailSections.processHeading ?? ""} onChange={(e) => setDetailSections({ ...detailSections, processHeading: e.target.value })} /></div>
                    <div><Label>Section text</Label><Textarea rows={2} value={detailSections.processDescription ?? ""} onChange={(e) => setDetailSections({ ...detailSections, processDescription: e.target.value })} /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3"><Label className="mb-0">Process steps</Label><Button type="button" variant="ghost" size="sm" onClick={() => setProcess([...process, { title: "", description: "" }])}><Plus className="size-4" /> Add step</Button></div>
                    <div className="mt-3 space-y-2">
                      {process.map((step, i) => (
                        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                          <Input placeholder="Step heading" value={step.title} onChange={(e) => setProcess(process.map((p, idx) => idx === i ? { ...p, title: e.target.value } : p))} />
                          <Input placeholder="Step text" value={step.description} onChange={(e) => setProcess(process.map((p, idx) => idx === i ? { ...p, description: e.target.value } : p))} />
                          <Button type="button" variant="ghost" size="icon" aria-label="Remove process step" onClick={() => setProcess(process.filter((_, idx) => idx !== i))}><Trash2 className="size-4 text-error-500" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="deliverables" className="mt-0">
                <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Section heading</Label><Input value={detailSections.deliverablesHeading ?? ""} onChange={(e) => setDetailSections({ ...detailSections, deliverablesHeading: e.target.value })} /></div>
                    <div><Label>Section text</Label><Textarea rows={2} value={detailSections.deliverablesDescription ?? ""} onChange={(e) => setDetailSections({ ...detailSections, deliverablesDescription: e.target.value })} /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3"><div><Label className="mb-0">Deliverable items</Label><p className="mt-1 text-body-sm text-neutral-500">Each item has a separate title and text.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setDetailSections({ ...detailSections, deliverableItems: [...(detailSections.deliverableItems ?? []), { title: "", description: "" }] })}><Plus className="size-4" /> Add deliverable</Button></div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {(detailSections.deliverableItems ?? []).map((item, i) => (
                        <div key={i} className="grid gap-2 rounded-lg border border-neutral-200 bg-surface p-3">
                          <div className="flex items-center gap-2"><Input placeholder="Deliverable title" value={item.title} onChange={(e) => setDetailSections({ ...detailSections, deliverableItems: (detailSections.deliverableItems ?? []).map((entry, index) => index === i ? { ...entry, title: e.target.value } : entry) })} /><Button type="button" variant="ghost" size="icon" aria-label="Remove deliverable" onClick={() => setDetailSections({ ...detailSections, deliverableItems: (detailSections.deliverableItems ?? []).filter((_, index) => index !== i) })}><Trash2 className="size-4 text-error-500" /></Button></div>
                          <Textarea rows={2} placeholder="Deliverable text" value={item.description} onChange={(e) => setDetailSections({ ...detailSections, deliverableItems: (detailSections.deliverableItems ?? []).map((entry, index) => index === i ? { ...entry, description: e.target.value } : entry) })} />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0">
                <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Section heading</Label><Input value={detailSections.pricingHeading ?? ""} onChange={(e) => setDetailSections({ ...detailSections, pricingHeading: e.target.value })} /></div>
                    <div><Label>Section text</Label><Textarea rows={2} value={detailSections.pricingDescription ?? ""} onChange={(e) => setDetailSections({ ...detailSections, pricingDescription: e.target.value })} /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3"><div><Label className="mb-0">Pricing plans</Label><p className="mt-1 text-body-sm text-neutral-500">A service displays pricing only when at least one plan is added.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setPlans([...plans, emptyPlan()])}><Plus className="size-4" /> Add plan</Button></div>
                    <div className="mt-3 space-y-4">
                      {plans.length === 0 && <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-body-sm text-neutral-500">No pricing plans added.</p>}
                      {plans.map((plan, i) => {
                        const errs = planErrors[i] ?? {};
                        return (
                          <div key={plan.id ?? i} className="space-y-3 rounded-xl border border-neutral-200 bg-surface p-4">
                            <div className="flex items-center justify-between gap-2"><Input placeholder="Plan name" value={plan.name} onChange={(e) => setPlans(plans.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p))} aria-invalid={!!errs.name} className="max-w-xs" /><Button type="button" variant="ghost" size="icon" aria-label="Remove pricing plan" onClick={() => setPlans(plans.filter((_, idx) => idx !== i))}><Trash2 className="size-4 text-error-500" /></Button></div>
                            <FieldError>{errs.name}</FieldError>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                              <div className="flex items-center gap-2"><Checkbox checked={plan.isCustomQuote} onCheckedChange={(c) => setPlans(plans.map((p, idx) => idx === i ? { ...p, isCustomQuote: c === true, regularPrice: c === true ? "" : p.regularPrice, discountPrice: c === true ? "" : p.discountPrice } : p))} /><Label className="mb-0">Custom quote</Label></div>
                              <div className="flex items-center gap-2"><Checkbox checked={plan.isFeatured} onCheckedChange={(c) => setPlans(plans.map((p, idx) => idx === i ? { ...p, isFeatured: c === true } : p))} /><Label className="mb-0">Featured</Label></div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div><Label>Regular price {!plan.isCustomQuote && "*"}</Label><Input type="number" min="0" step="0.01" disabled={plan.isCustomQuote} value={plan.regularPrice} onChange={(e) => setPlans(plans.map((p, idx) => idx === i ? { ...p, regularPrice: e.target.value } : p))} aria-invalid={!!errs.regularPrice} placeholder="1500" /><FieldError>{errs.regularPrice}</FieldError></div>
                              <div><Label>Discount price</Label><Input type="number" min="0" step="0.01" disabled={plan.isCustomQuote} value={plan.discountPrice} onChange={(e) => setPlans(plans.map((p, idx) => idx === i ? { ...p, discountPrice: e.target.value } : p))} aria-invalid={!!errs.discountPrice} placeholder="1200" /><FieldError>{errs.discountPrice}</FieldError></div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div><Label>Billing type</Label><Select value={plan.billingType} onValueChange={(v) => setPlans(plans.map((p, idx) => idx === i ? { ...p, billingType: v } : p))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{billingTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                              <div><Label>Price label</Label><Input value={plan.priceLabel} onChange={(e) => setPlans(plans.map((p, idx) => idx === i ? { ...p, priceLabel: e.target.value } : p))} placeholder="Starting from" /></div>
                              <div><Label>Currency</Label><Combobox value={plan.currency || "__global__"} onValueChange={(v) => setPlans(plans.map((p, idx) => idx === i ? { ...p, currency: v === "__global__" ? "" : v } : p))} searchPlaceholder="Search currencies…" options={[{ value: "__global__", label: "Use global default" }, ...CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: c.label, secondary: c.code + " · " + c.symbol, keywords: [c.code, c.symbol] }))]} /></div>
                            </div>
                            <div><Label>Features (one per line)</Label><Textarea rows={3} value={plan.features} onChange={(e) => setPlans(plans.map((p, idx) => idx === i ? { ...p, features: e.target.value } : p))} /></div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div><Label>CTA label</Label><Input value={plan.ctaLabel} onChange={(e) => setPlans(plans.map((p, idx) => idx === i ? { ...p, ctaLabel: e.target.value } : p))} /></div>
                              <div><Label>CTA link</Label><Input value={plan.ctaHref} onChange={(e) => setPlans(plans.map((p, idx) => idx === i ? { ...p, ctaHref: e.target.value } : p))} /></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="reviews" className="mt-0">
                <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Section heading</Label><Input value={detailSections.reviewsHeading ?? ""} onChange={(e) => setDetailSections({ ...detailSections, reviewsHeading: e.target.value })} /></div>
                    <div><Label>Section text</Label><Textarea rows={2} value={detailSections.reviewsDescription ?? ""} onChange={(e) => setDetailSections({ ...detailSections, reviewsDescription: e.target.value })} /></div>
                  </div>
                  <p className="text-body-sm text-neutral-500">Customer review entries are managed in the Reviews area.</p>
                </section>
              </TabsContent>
            </Tabs>
          </section>

          <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <div><h3 className="font-heading text-h4 font-bold text-heading">Additional page sections</h3><p className="mt-1 text-body-sm text-neutral-500">Manage scope and call-to-action content shown after the main sections.</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Project scope heading</Label><Input value={detailSections.scopeHeading ?? ""} onChange={(e) => setDetailSections({ ...detailSections, scopeHeading: e.target.value })} /></div>
              <div><Label>Project scope text</Label><Textarea rows={2} value={detailSections.scopeDescription ?? ""} onChange={(e) => setDetailSections({ ...detailSections, scopeDescription: e.target.value })} /></div>
              <div><Label>CTA heading</Label><Input value={detailSections.ctaHeading ?? ""} onChange={(e) => setDetailSections({ ...detailSections, ctaHeading: e.target.value })} /></div>
              <div><Label>CTA text</Label><Textarea rows={2} value={detailSections.ctaDescription ?? ""} onChange={(e) => setDetailSections({ ...detailSections, ctaDescription: e.target.value })} /></div>
              <div><Label>CTA button label</Label><Input value={detailSections.ctaButtonLabel ?? ""} onChange={(e) => setDetailSections({ ...detailSections, ctaButtonLabel: e.target.value })} /></div>
              <div><Label>CTA button link</Label><Input value={detailSections.ctaButtonHref ?? ""} onChange={(e) => setDetailSections({ ...detailSections, ctaButtonHref: e.target.value })} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3"><Label className="mb-0">Project scope items</Label><Button type="button" variant="ghost" size="sm" onClick={() => setDetailSections({ ...detailSections, scopeItems: [...(detailSections.scopeItems ?? []), { title: "", description: "" }] })}><Plus className="size-4" /> Add scope item</Button></div>
              <p className="mt-1 text-body-sm text-neutral-500">Manage the scope list independently from Benefits.</p>
              <div className="mt-3 space-y-3">
                {(detailSections.scopeItems ?? []).map((item, i) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-neutral-200 bg-surface p-3 md:grid-cols-[1fr_2fr_auto]">
                    <Input placeholder="Scope item title" value={item.title} onChange={(e) => setDetailSections({ ...detailSections, scopeItems: (detailSections.scopeItems ?? []).map((entry, index) => index === i ? { ...entry, title: e.target.value } : entry) })} />
                    <Textarea rows={2} placeholder="Scope item text" value={item.description} onChange={(e) => setDetailSections({ ...detailSections, scopeItems: (detailSections.scopeItems ?? []).map((entry, index) => index === i ? { ...entry, description: e.target.value } : entry) })} />
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove scope item" onClick={() => setDetailSections({ ...detailSections, scopeItems: (detailSections.scopeItems ?? []).filter((_, index) => index !== i) })}><Trash2 className="size-4 text-error-500" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <h3 className="font-heading text-h4 font-bold text-heading">SEO</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Meta title</Label><Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} /></div>
              <div><Label>Meta description</Label><Input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} /></div>
            </div>
          </section>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 bg-background px-5 py-3 sm:px-7">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const servicesSortOptions = [
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "order", label: "Sort order" },
  { value: "createdAt", label: "Date created" },
  { value: "updatedAt", label: "Date updated" },
];
const statusFilterOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase(),
}));

function ServicesPageInner() {
  const { data: categories } = useAsyncData<Category[]>(
    () => request<{ items: Category[] }>("/categories/services").then((r) => r.items),
    [],
  );
  const { data: technologies } = useAsyncData<Technology[]>(
    () => request<{ items: Technology[] }>("/categories/technologies").then((r) => r.items),
    [],
  );

  const list = usePaginatedList<Service>({
    endpoint: "/services/admin",
    defaultSortBy: "order",
    defaultSortOrder: "asc",
    filterKeys: ["status", "categoryId"],
  });

  const [editing, setEditing] = React.useState<Service | null | undefined>(undefined);
  useOpenOnNew(() => setEditing(null));
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  function handleDelete(id: string) {
    confirmDelete({
      title: "Delete this service?",
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`/services/${id}`, { method: "DELETE" });
        toast.success("Deleted");
        list.reload();
      },
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <Heading level={2} className="admin-page-title">Services</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">Manage services, pricing, and process shown on the public site.</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus /> Add service
        </Button>
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search name, tagline, or description…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={servicesSortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[
            { key: "status", label: "Status", options: statusFilterOptions },
            { key: "categoryId", label: "Category", options: (categories ?? []).map((c) => ({ value: c.id, label: c.name })) },
          ]}
          onFilterChange={list.setFilter}
          limit={list.limit}
          onLimitChange={list.setLimit}
          hasActiveFilters={list.hasActiveFilters}
          onClearFilters={list.clearFilters}
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <Skeleton className="h-64 w-full" />
        ) : list.error ? (
          <p className="text-center text-body-sm text-error-500">{list.error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>{service.category?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={service.status === "PUBLISHED" ? "success" : "neutral"}>{service.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(service)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(list.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState hasActiveFilters={list.hasActiveFilters} label="services" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!list.loading && !list.error && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <ListSummary meta={list.meta} />
          <Pagination page={list.page} totalPages={list.meta?.totalPages ?? 1} onPageChange={list.setPage} />
        </div>
      )}

      {editing !== undefined && (
        <ServiceEditor
          service={editing}
          categories={categories ?? []}
          technologies={technologies ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            list.reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">All Services</TabsTrigger>
        <TabsTrigger value="content">Page Content</TabsTrigger>
        <TabsTrigger value="sections">Page Sections</TabsTrigger>
      </TabsList>
      <TabsContent value="list">
        <Suspense fallback={null}>
          <ServicesPageInner />
        </Suspense>
      </TabsContent>
      <TabsContent value="content">
        <Heading level={2}>Services Page Content</Heading>
        <p className="mt-1 text-body-sm text-neutral-500">The hero heading and paragraph at the top of the public Services page.</p>
        <div className="mt-6">
          <PageHeroContentForm
            endpoint="/pages/services"
            emptyValues={{ heroHeading: "", heroDescription: "" }}
            fields={[
              { key: "heroHeading", label: "Hero heading", isHeading: true, placeholder: "Services built to **ship**, not just to pitch." },
              { key: "heroDescription", label: "Hero paragraph", type: "textarea" },
            ]}
            successMessage="Services page content updated"
          />
        </div>
      </TabsContent>
      <TabsContent value="sections">
        <Heading level={2}>Services Page Sections</Heading>
        <div className="mt-6">
          <ServicesPageSettingsForm />
        </div>
      </TabsContent>
    </Tabs>
  );
}
