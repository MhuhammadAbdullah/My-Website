"use client";

import * as React from "react";
import { Suspense } from "react";
import { Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";

interface InfluencerListItem {
  id: string;
  name: string;
  email: string;
  status: "APPROVED" | "SUSPENDED";
  profile: {
    username: string;
    city: string | null;
    countryCode: string | null;
    isVerified: boolean;
    isFeatured: boolean;
    featuredOrder: number;
    availableForBooking: boolean;
    publicStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    ratingAverage: string;
    ratingCount: number;
    commissionOverridePercent: string | null;
    categories: { name: string }[];
  } | null;
}

const statusFilterOptions = [
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
];
const sortOptions = [
  { value: "name", label: "Name" },
  { value: "createdAt", label: "Date joined" },
];

function InfluencersPageInner() {
  const list = usePaginatedList<InfluencerListItem>({
    endpoint: "/influencers/admin",
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    filterKeys: ["status"],
  });
  const [openId, setOpenId] = React.useState<string | null>(null);
  const { can } = usePermissions();
  const canDelete = can("influencers", "delete");
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const rows = list.data ?? [];

  // Row selection is scoped to the current page — drop it whenever the page
  // itself, or anything that reshuffles which rows are on it, changes.
  React.useEffect(() => {
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.search, list.sortBy, list.sortOrder, JSON.stringify(list.filters)]);

  // After a delete, stay on the current page if it still has rows; if the
  // deleted row(s) emptied it, step back a page (unless already on page 1).
  function afterDelete(deletedCount: number) {
    const remaining = rows.length - deletedCount;
    if (remaining <= 0 && list.page > 1) {
      list.setPage(list.page - 1);
    } else {
      list.reload();
    }
  }

  function handleDelete(inf: InfluencerListItem) {
    confirmDelete({
      title: "Delete this influencer?",
      description: `Delete ${inf.name}${inf.profile ? ` (@${inf.profile.username})` : ""} and all of their profile data (platforms, portfolio, pricing, badges)?\n\nInfluencers with existing bookings or payouts can't be deleted — suspend their account instead.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`/influencers/admin/${inf.id}`, { method: "DELETE" });
        toast.success("Influencer deleted");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(inf.id);
          return next;
        });
        afterDelete(1);
      },
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    confirmDelete({
      title: `Delete ${ids.length} influencer${ids.length === 1 ? "" : "s"}?`,
      description:
        "Influencers with existing bookings or payouts won't be deleted — the whole selection is blocked if even one of them has business history. Suspend those instead.\n\nThis action cannot be undone.",
      onConfirm: async () => {
        const res = await request<{ count: number }>("/influencers/admin/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} influencer${res.count === 1 ? "" : "s"} deleted`);
        setSelected(new Set());
        afterDelete(ids.length);
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

  const columnCount = canDelete ? 8 : 7;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level={2}>Influencers</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Manage approved marketplace profiles — verification, featured placement, availability, and commission overrides.
          </p>
        </div>
        {canDelete && selected.size > 0 && (
          <Button variant="outline" className="text-error-500" onClick={handleBulkDelete}>
            <Trash2 className="size-4" /> Delete {selected.size} selected
          </Button>
        )}
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search influencers…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={sortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[{ key: "status", label: "Status", options: statusFilterOptions }]}
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
                      aria-label="Select all influencers"
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Public</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inf) => (
                <TableRow key={inf.id}>
                  {canDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(inf.id)}
                        onCheckedChange={(checked) => toggleOne(inf.id, checked === true)}
                        aria-label={`Select ${inf.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {inf.name}
                      {inf.profile?.isVerified && <Badge variant="accent">Verified</Badge>}
                      {inf.profile?.isFeatured && <Badge variant="dark">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{inf.profile ? `@${inf.profile.username}` : "—"}</TableCell>
                  <TableCell>{[inf.profile?.city, inf.profile?.countryCode].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>
                    {inf.profile ? `${Number(inf.profile.ratingAverage).toFixed(1)} (${inf.profile.ratingCount})` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={inf.status === "APPROVED" ? "success" : "error"}>{inf.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={inf.profile?.publicStatus === "PUBLISHED" ? "success" : "neutral"}>
                      {inf.profile?.publicStatus ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setOpenId(inf.id)}>
                        Manage
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(inf)} aria-label={`Delete ${inf.name}`}>
                          <Trash2 className="size-4 text-error-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-neutral-400">
                    {list.hasActiveFilters ? <EmptyState hasActiveFilters label="influencers" /> : <Badge variant="neutral">No influencers yet</Badge>}
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

      {openId && (
        <InfluencerManageDialog
          id={openId}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            setOpenId(null);
            list.reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

function InfluencerManageDialog({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [item, setItem] = React.useState<InfluencerListItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    isVerified: false,
    isFeatured: false,
    featuredOrder: 0,
    availableForBooking: true,
    publicStatus: "PUBLISHED" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    commissionOverridePercent: "",
    status: "APPROVED" as "APPROVED" | "SUSPENDED",
  });

  React.useEffect(() => {
    setLoading(true);
    request<{ item: InfluencerListItem }>(`/influencers/admin/${id}`)
      .then((r) => {
        setItem(r.item);
        if (r.item.profile) {
          setForm({
            isVerified: r.item.profile.isVerified,
            isFeatured: r.item.profile.isFeatured,
            featuredOrder: r.item.profile.featuredOrder,
            availableForBooking: r.item.profile.availableForBooking,
            publicStatus: r.item.profile.publicStatus,
            commissionOverridePercent: r.item.profile.commissionOverridePercent ?? "",
            status: r.item.status,
          });
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load influencer"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await request(`/influencers/admin/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isVerified: form.isVerified,
          isFeatured: form.isFeatured,
          featuredOrder: form.featuredOrder,
          availableForBooking: form.availableForBooking,
          publicStatus: form.publicStatus,
          commissionOverridePercent: form.commissionOverridePercent === "" ? null : Number(form.commissionOverridePercent),
          status: form.status,
        }),
      });
      toast.success("Influencer updated");
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
          <DialogTitle>{item ? item.name : "Influencer"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading || !item ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                <div>
                  <p className="text-body-sm font-medium text-heading">Verified badge</p>
                  <p className="text-label text-neutral-400">Shows a verified checkmark on their public profile</p>
                </div>
                <Switch checked={form.isVerified} onCheckedChange={(v) => setForm((f) => ({ ...f, isVerified: v }))} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                <div>
                  <p className="text-body-sm font-medium text-heading">Featured</p>
                  <p className="text-label text-neutral-400">Promotes this profile to the top of the marketplace</p>
                </div>
                <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))} />
              </div>

              {form.isFeatured && (
                <div>
                  <Label>Featured order (lower shows first)</Label>
                  <Input
                    type="number"
                    value={form.featuredOrder}
                    onChange={(e) => setForm((f) => ({ ...f, featuredOrder: Number(e.target.value) }))}
                  />
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                <div>
                  <p className="text-body-sm font-medium text-heading">Available for booking</p>
                  <p className="text-label text-neutral-400">Staff override — influencers also control this from their dashboard</p>
                </div>
                <Switch checked={form.availableForBooking} onCheckedChange={(v) => setForm((f) => ({ ...f, availableForBooking: v }))} />
              </div>

              <div>
                <Label>Public visibility</Label>
                <Select value={form.publicStatus} onValueChange={(v) => setForm((f) => ({ ...f, publicStatus: v as typeof f.publicStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLISHED">Published (visible in the marketplace)</SelectItem>
                    <SelectItem value="DRAFT">Draft (hidden)</SelectItem>
                    <SelectItem value="ARCHIVED">Archived (hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Commission override % (blank = use global rate)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={form.commissionOverridePercent}
                  onChange={(e) => setForm((f) => ({ ...f, commissionOverridePercent: e.target.value }))}
                  placeholder="e.g. 15"
                />
              </div>

              <div>
                <Label>Account status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof f.status }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended (login blocked, profile hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InfluencersPage() {
  return (
    <Suspense fallback={null}>
      <InfluencersPageInner />
    </Suspense>
  );
}
