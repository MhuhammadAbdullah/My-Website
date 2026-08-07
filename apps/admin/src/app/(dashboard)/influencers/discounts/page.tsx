"use client";

import * as React from "react";
import { Suspense } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  toast,
} from "@agency/ui";
import type { DISCOUNT_SCOPES } from "@agency/types";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { ColorDot, ColorSelect } from "@/components/color-select";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";

type DiscountType = "PERCENT" | "FIXED";
type DiscountScope = (typeof DISCOUNT_SCOPES)[number];

interface DiscountListItem {
  id: string;
  code: string | null;
  label: string;
  type: DiscountType;
  scope: DiscountScope;
  value: string;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  minBookingAmount: string | null;
  isActive: boolean;
  color: string | null;
  // One row per influencer this discount was fanned out to (brief: every
  // scope, even ALL/CATEGORY, needs each affected influencer's own
  // approval before it shows on their cards) -- the list view only needs
  // aggregate counts, not who specifically.
  responses: { status: "PENDING" | "APPROVED" | "DECLINED" }[];
  influencer: { id: string; name: string; profile: { username: string } | null } | null;
  category: { id: string; name: string } | null;
}

function approvalSummary(responses: DiscountListItem["responses"]) {
  const approved = responses.filter((r) => r.status === "APPROVED").length;
  const pending = responses.filter((r) => r.status === "PENDING").length;
  const declined = responses.filter((r) => r.status === "DECLINED").length;
  return { approved, pending, declined, total: responses.length };
}

interface OptionItem {
  id: string;
  name?: string;
  profile?: { username: string } | null;
}

// Whatever scope is picked, every discount always needs each affected
// influencer's own approval before it shows on their cards or applies to
// their bookings (brief: admin proposes, each influencer individually
// accepts/declines) -- these hints only clarify *who* gets asked, not
// whether anyone needs to be.
const scopeOptions = [
  {
    value: "ALL",
    label: "All bookings",
    hint: "Every currently-approved influencer is asked individually — each one's cards only show it once they approve it.",
  },
  {
    value: "INFLUENCER",
    label: "Specific influencer",
    hint: "Only that one influencer is asked — their cards show it once they approve it.",
  },
  {
    value: "CATEGORY",
    label: "Category",
    hint: "Every influencer in that category is asked individually — each one's cards only show it once they approve it.",
  },
  {
    value: "FIRST_BOOKING",
    label: "First booking only",
    hint: "Every currently-approved influencer is asked individually — only applies to a client's first booking with one who approved it.",
  },
];

const sortOptions = [
  { value: "createdAt", label: "Date created" },
  { value: "label", label: "Label" },
  { value: "usedCount", label: "Times used" },
  { value: "value", label: "Value" },
];

function DiscountsPageInner() {
  const list = usePaginatedList<DiscountListItem>({
    endpoint: "/discounts/admin",
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    filterKeys: ["scope", "isActive"],
  });
  const [dialogItem, setDialogItem] = React.useState<DiscountListItem | null | "new">(null);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const { can } = usePermissions();
  const canDelete = can("discounts", "delete");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const rows = list.data ?? [];

  React.useEffect(() => {
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.search, list.sortBy, list.sortOrder, JSON.stringify(list.filters)]);

  function handleDelete(item: DiscountListItem) {
    confirmDelete({
      title: `Delete "${item.label}"?`,
      description: `Removes it immediately from every influencer card it's currently showing on${item.code ? `, and the promo code "${item.code}" stops working right away for new bookings` : ""}.\n\nBlocked if any booking has already used this discount (that record can't be broken) — uncheck "Active" in Edit instead in that case.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`/discounts/${item.id}`, { method: "DELETE" });
        toast.success("Discount deleted");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        list.reload();
      },
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    confirmDelete({
      title: `Delete ${ids.length} discount${ids.length === 1 ? "" : "s"}?`,
      description: `Removes all ${ids.length} selected discounts immediately from any influencer cards they're showing on, and any promo codes among them stop working right away.\n\nThe whole selection is blocked if even one has already been used by a booking (that record can't be broken) — deactivate those instead.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        const res = await request<{ count: number }>("/discounts/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} discount${res.count === 1 ? "" : "s"} deleted`);
        setSelected(new Set());
        list.reload();
      },
    });
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const columnCount = canDelete ? 10 : 9;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Discounts & promotions</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Percentage/fixed discounts and promo codes clients can redeem when booking. Codeless discounts (no code set) auto-apply to
            eligible bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && selected.size > 0 && (
            <Button variant="outline" className="text-error-500" onClick={handleBulkDelete}>
              <Trash2 className="size-4" /> Delete {selected.size} selected
            </Button>
          )}
          <Button onClick={() => setDialogItem("new")}>
            <Plus /> New discount
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search label or code…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={sortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[
            { key: "scope", label: "Scope", options: scopeOptions },
            {
              key: "isActive",
              label: "Status",
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ],
            },
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
                {canDelete && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleAll(checked === true)}
                      aria-label="Select all discounts"
                    />
                  </TableHead>
                )}
                <TableHead>Color</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  {canDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(d.id)}
                        onCheckedChange={(checked) => toggleOne(d.id, checked === true)}
                        aria-label={`Select ${d.label}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <ColorDot color={d.color} />
                  </TableCell>
                  <TableCell className="font-medium text-heading">{d.label}</TableCell>
                  <TableCell>{d.code ?? <span className="text-neutral-400">Automatic</span>}</TableCell>
                  <TableCell>{d.type === "PERCENT" ? `${Number(d.value)}%` : Number(d.value).toLocaleString()}</TableCell>
                  <TableCell>
                    {scopeOptions.find((s) => s.value === d.scope)?.label}
                    {d.scope === "INFLUENCER" && d.influencer && (
                      <span className="text-label text-neutral-400"> · @{d.influencer.profile?.username ?? d.influencer.name}</span>
                    )}
                    {d.scope === "CATEGORY" && d.category && <span className="text-label text-neutral-400"> · {d.category.name}</span>}
                  </TableCell>
                  <TableCell>
                    {d.usedCount}
                    {d.maxUses ? ` / ${d.maxUses}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.isActive ? "success" : "neutral"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const s = approvalSummary(d.responses);
                      if (s.total === 0) return <span className="text-neutral-400">—</span>;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {s.approved > 0 && <Badge variant="success">{s.approved} approved</Badge>}
                          {s.pending > 0 && <Badge variant="warning">{s.pending} pending</Badge>}
                          {s.declined > 0 && <Badge variant="error">{s.declined} declined</Badge>}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDialogItem(d)}>
                        Edit
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="text-error-500" onClick={() => handleDelete(d)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-neutral-400">
                    {list.hasActiveFilters ? <EmptyState hasActiveFilters label="discounts" /> : <Badge variant="neutral">No discounts yet</Badge>}
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

      {dialogItem && (
        <DiscountDialog
          item={dialogItem === "new" ? null : dialogItem}
          onClose={() => setDialogItem(null)}
          onSaved={() => {
            setDialogItem(null);
            list.reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

interface DiscountFormState {
  code: string;
  label: string;
  type: DiscountType;
  scope: DiscountScope;
  value: string;
  influencerId: string;
  categoryId: string;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  minBookingAmount: string;
  isActive: boolean;
  color: string | null;
}

function toFormState(item: DiscountListItem | null): DiscountFormState {
  return {
    code: item?.code ?? "",
    label: item?.label ?? "",
    type: item?.type ?? "PERCENT",
    scope: item?.scope ?? "ALL",
    value: item?.value ?? "",
    influencerId: item?.influencer?.id ?? "",
    categoryId: item?.category?.id ?? "",
    startsAt: item?.startsAt ? item.startsAt.slice(0, 10) : "",
    endsAt: item?.endsAt ? item.endsAt.slice(0, 10) : "",
    maxUses: item?.maxUses ? String(item.maxUses) : "",
    minBookingAmount: item?.minBookingAmount ?? "",
    isActive: item?.isActive ?? true,
    color: item?.color ?? null,
  };
}

function DiscountDialog({ item, onClose, onSaved }: { item: DiscountListItem | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState<DiscountFormState>(toFormState(item));
  const [saving, setSaving] = React.useState(false);

  const { data: influencers } = useAsyncData<OptionItem[]>(
    () => request<{ items: OptionItem[] }>("/influencers/admin?limit=100&status=APPROVED").then((r) => r.items),
    [],
  );
  const { data: categories } = useAsyncData<OptionItem[]>(
    () => request<{ items: OptionItem[] }>("/categories/influencers").then((r) => r.items),
    [],
  );

  function set<K extends keyof DiscountFormState>(key: K, value: DiscountFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      toast.error("Enter a value greater than 0");
      return;
    }
    setSaving(true);
    try {
      const body = {
        code: form.code.trim() || undefined,
        label: form.label,
        type: form.type,
        scope: form.scope,
        value: Number(form.value),
        influencerId: form.scope === "INFLUENCER" ? form.influencerId : undefined,
        categoryId: form.scope === "CATEGORY" ? form.categoryId : undefined,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        minBookingAmount: form.minBookingAmount ? Number(form.minBookingAmount) : null,
        isActive: form.isActive,
        color: form.color,
      };
      if (item) {
        await request(`/discounts/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("Discount updated");
      } else {
        await request("/discounts", { method: "POST", body: JSON.stringify(body) });
        toast.success("Discount created");
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>{item ? "Edit discount" : "New discount"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Summer Sale" />
          </div>

          <div>
            <Label>Promo code (optional — leave blank to auto-apply)</Label>
            <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="e.g. SUMMER25" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as DiscountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percentage</SelectItem>
                  <SelectItem value="FIXED">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value {form.type === "PERCENT" ? "(%)" : ""}</Label>
              <Input type="number" min={0} value={form.value} onChange={(e) => set("value", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Badge color</Label>
            <ColorSelect value={form.color} onValueChange={(v) => set("color", v)} />
            <p className="mt-1 text-label text-neutral-400">Color of the "X% OFF" badge shown on the influencer's cards. Defaults if unset.</p>
          </div>

          <div>
            <Label>Scope</Label>
            <Select value={form.scope} onValueChange={(v) => set("scope", v as DiscountScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-label text-warning-600">{scopeOptions.find((s) => s.value === form.scope)?.hint}</p>
          </div>

          {form.scope === "INFLUENCER" && (
            <div>
              <Label>Influencer</Label>
              <Combobox
                value={form.influencerId}
                onValueChange={(v) => set("influencerId", v)}
                placeholder="Select influencer"
                searchPlaceholder="Search influencers…"
                options={(influencers ?? []).map((i) => ({ value: i.id, label: i.profile ? `@${i.profile.username}` : (i.name ?? "") }))}
              />
            </div>
          )}

          {form.scope === "CATEGORY" && (
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Starts (optional)</Label>
              <Input type="date" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            </div>
            <div>
              <Label>Ends (optional)</Label>
              <Input type="date" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Max uses (optional)</Label>
              <Input type="number" min={1} value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="Unlimited" />
            </div>
            <div>
              <Label>Min. booking amount (optional)</Label>
              <Input
                type="number"
                min={0}
                value={form.minBookingAmount}
                onChange={(e) => set("minBookingAmount", e.target.value)}
                placeholder="No minimum"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={form.isActive} onCheckedChange={(c) => set("isActive", c === true)} id="discount-active" />
            <Label htmlFor="discount-active" className="font-normal">
              Active
            </Label>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
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

export default function DiscountsPage() {
  return (
    <Suspense fallback={null}>
      <DiscountsPageInner />
    </Suspense>
  );
}
