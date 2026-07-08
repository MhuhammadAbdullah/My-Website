"use client";

import * as React from "react";
import { Suspense } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Textarea,
  toast,
} from "@agency/ui";
import { CURRENCY_OPTIONS } from "@agency/types";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";

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
    benefits: service?.benefits.join("\n") ?? "",
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
        benefits: form.benefits.split("\n").map((s) => s.trim()).filter(Boolean),
        deliverables: form.deliverables.split("\n").map((s) => s.trim()).filter(Boolean),
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
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Service["status"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timeline</Label>
              <Input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} placeholder="4–6 weeks" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox checked={form.isFeatured} onCheckedChange={(c) => setForm({ ...form, isFeatured: c === true })} />
            <Label className="mb-0">Featured service</Label>
          </div>

          <div>
            <Label>Technologies used</Label>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => {
                const active = form.technologyIds.includes(tech.id);
                return (
                  <button
                    type="button"
                    key={tech.id}
                    onClick={() =>
                      setForm({
                        ...form,
                        technologyIds: active
                          ? form.technologyIds.filter((id) => id !== tech.id)
                          : [...form.technologyIds, tech.id],
                      })
                    }
                  >
                    <Badge variant={active ? "accent" : "neutral"}>{tech.name}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Benefits (one per line)</Label>
            <Textarea rows={4} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
          </div>
          <div>
            <Label>Deliverables (one per line)</Label>
            <Textarea rows={3} value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="mb-0">Process steps</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setProcess([...process, { title: "", description: "" }])}>
                <Plus className="size-4" /> Add step
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {process.map((step, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Input
                    placeholder="Title"
                    value={step.title}
                    onChange={(e) => setProcess(process.map((p, idx) => (idx === i ? { ...p, title: e.target.value } : p)))}
                  />
                  <Input
                    placeholder="Description"
                    value={step.description}
                    onChange={(e) => setProcess(process.map((p, idx) => (idx === i ? { ...p, description: e.target.value } : p)))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setProcess(process.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-error-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="mb-0">Pricing plans</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPlans([...plans, emptyPlan()])}>
                <Plus className="size-4" /> Add plan
              </Button>
            </div>
            <p className="mt-1 text-body-sm text-neutral-500">
              A service shows pricing on the site only when it has at least one plan here.
            </p>
            <div className="mt-3 space-y-4">
              {plans.length === 0 && (
                <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-body-sm text-neutral-500">
                  No pricing plans yet — this service's price will not be shown on the site.
                </p>
              )}
              {plans.map((plan, i) => {
                const errs = planErrors[i] ?? {};
                return (
                  <div key={plan.id ?? i} className="space-y-3 rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder="Plan name"
                        value={plan.name}
                        onChange={(e) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, name: e.target.value } : p)))}
                        aria-invalid={!!errs.name}
                        className="max-w-xs"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setPlans(plans.filter((_, idx) => idx !== i))}>
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </div>
                    <FieldError>{errs.name}</FieldError>

                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={plan.isCustomQuote}
                          onCheckedChange={(c) =>
                            setPlans(
                              plans.map((p, idx) =>
                                idx === i
                                  ? {
                                      ...p,
                                      isCustomQuote: c === true,
                                      regularPrice: c === true ? "" : p.regularPrice,
                                      discountPrice: c === true ? "" : p.discountPrice,
                                    }
                                  : p,
                              ),
                            )
                          }
                        />
                        <Label className="mb-0">Custom quote (no fixed price)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={plan.isFeatured}
                          onCheckedChange={(c) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, isFeatured: c === true } : p)))}
                        />
                        <Label className="mb-0">Featured</Label>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Regular price {!plan.isCustomQuote && "*"}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={plan.isCustomQuote}
                          value={plan.regularPrice}
                          onChange={(e) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, regularPrice: e.target.value } : p)))}
                          aria-invalid={!!errs.regularPrice}
                          placeholder="1500"
                        />
                        <FieldError>{errs.regularPrice}</FieldError>
                      </div>
                      <div>
                        <Label>Discount price (optional)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={plan.isCustomQuote}
                          value={plan.discountPrice}
                          onChange={(e) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, discountPrice: e.target.value } : p)))}
                          aria-invalid={!!errs.discountPrice}
                          placeholder="1200"
                        />
                        <FieldError>{errs.discountPrice}</FieldError>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label>Billing type</Label>
                        <Select value={plan.billingType} onValueChange={(v) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, billingType: v } : p)))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {billingTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Price label (optional)</Label>
                        <Input
                          value={plan.priceLabel}
                          onChange={(e) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, priceLabel: e.target.value } : p)))}
                          placeholder="Starting from"
                        />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Combobox
                          value={plan.currency || "__global__"}
                          onValueChange={(v) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, currency: v === "__global__" ? "" : v } : p)))}
                          searchPlaceholder="Search currencies…"
                          options={[
                            { value: "__global__", label: "Use global default" },
                            ...CURRENCY_OPTIONS.map((c) => ({
                              value: c.code,
                              label: c.label,
                              secondary: `${c.code} · ${c.symbol}`,
                              keywords: [c.code, c.symbol],
                            })),
                          ]}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Features (one per line)</Label>
                      <Textarea
                        rows={3}
                        value={plan.features}
                        onChange={(e) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, features: e.target.value } : p)))}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>CTA label</Label>
                        <Input
                          value={plan.ctaLabel}
                          onChange={(e) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, ctaLabel: e.target.value } : p)))}
                        />
                      </div>
                      <div>
                        <Label>CTA link</Label>
                        <Input
                          value={plan.ctaHref}
                          onChange={(e) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, ctaHref: e.target.value } : p)))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>SEO meta title</Label>
              <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
            </div>
            <div>
              <Label>SEO meta description</Label>
              <Input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 px-5 py-3">
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
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Services</Heading>
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
    <Suspense fallback={null}>
      <ServicesPageInner />
    </Suspense>
  );
}
