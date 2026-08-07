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
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";
import { PAYOUT_STATUSES, orderedPayoutMethodDetails } from "@agency/types";

type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";

interface PayoutListItem {
  id: string;
  payoutNumber: string;
  status: PayoutStatus;
  totalAmount: string;
  currency: string;
  method: string;
  createdAt: string;
  processedAt: string | null;
  influencer: { name: string; profile: { username: string } | null };
}

interface PayoutBookingRow {
  amount: string;
  booking: { id: string; bookingNumber: string; businessName: string; netInfluencerEarning: string; completedAt: string | null };
}

interface PayoutDetail extends PayoutListItem {
  notes: string | null;
  payoutDetailsSnapshot: Record<string, string>;
  processedBy: { name: string } | null;
  bookings: PayoutBookingRow[];
  allowedTransitions: PayoutStatus[];
}

interface InfluencerOption {
  id: string;
  name: string;
  profile: { username: string } | null;
}

interface EligibleBooking {
  id: string;
  bookingNumber: string;
  businessName: string;
  netInfluencerEarning: string;
  completedAt: string | null;
}

interface PayoutMethodQueueItem {
  id: string;
  type: string;
  details: Record<string, string>;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  influencer: { name: string; email: string; profile: { username: string } | null };
}

const statusFilterOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];
const sortOptions = [
  { value: "createdAt", label: "Date created" },
  { value: "payoutNumber", label: "Payout #" },
  { value: "status", label: "Status" },
  { value: "totalAmount", label: "Amount" },
];

function statusVariant(status: PayoutStatus): "success" | "error" | "warning" | "accent" | "neutral" {
  if (status === "PAID") return "success";
  if (status === "FAILED" || status === "CANCELLED") return "error";
  if (status === "PENDING") return "warning";
  return "accent";
}

function formatMoney(value: string | number, currency = "") {
  return `${currency ? `${currency} ` : ""}${Number(value).toLocaleString()}`;
}

const DELETABLE_PAYOUT_STATUSES: PayoutStatus[] = ["PENDING", "CANCELLED"];

function PayoutsPageInner() {
  const list = usePaginatedList<PayoutListItem>({
    endpoint: "/influencer-payouts/admin",
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    filterKeys: ["status"],
  });
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const { can } = usePermissions();
  const canDelete = can("influencerPayouts", "delete");
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const rows = list.data ?? [];
  const deletableRows = rows.filter((r) => DELETABLE_PAYOUT_STATUSES.includes(r.status));

  React.useEffect(() => {
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.search, list.sortBy, list.sortOrder, JSON.stringify(list.filters)]);

  function afterDelete(deletedCount: number) {
    const remaining = rows.length - deletedCount;
    if (remaining <= 0 && list.page > 1) {
      list.setPage(list.page - 1);
    } else {
      list.reload();
    }
  }

  function handleDelete(p: PayoutListItem) {
    confirmDelete({
      title: `Delete payout ${p.payoutNumber}?`,
      description: `Only shown here because it's Pending or Cancelled — Processing/Paid/Failed payouts can never be deleted, to protect financial records.\n\nDeleting it also releases the bookings bundled into ${p.payoutNumber}, so they become eligible for a new payout batch again.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`/influencer-payouts/admin/${p.id}`, { method: "DELETE" });
        toast.success("Payout deleted, its bookings are eligible for payout again");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
        afterDelete(1);
      },
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    confirmDelete({
      title: `Delete ${ids.length} payout${ids.length === 1 ? "" : "s"}?`,
      description: `Deletes all ${ids.length} selected payout${ids.length === 1 ? "" : "s"} and releases their bundled bookings, making them eligible for a new payout batch again.\n\nThe whole selection is blocked if even one selected payout is Processing, Paid, or Failed (financial records are protected) — only Pending/Cancelled payouts can be deleted.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        const res = await request<{ count: number }>("/influencer-payouts/admin/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} payout${res.count === 1 ? "" : "s"} deleted, bookings released for payout again`);
        setSelected(new Set());
        afterDelete(ids.length);
      },
    });
  }

  const allSelected = deletableRows.length > 0 && selected.size === deletableRows.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(deletableRows.map((r) => r.id)) : new Set());
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
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Payouts</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Batch completed bookings into payouts, track their status, and review influencer payout method requests.
          </p>
        </div>
        {canDelete && selected.size > 0 && (
          <Button variant="outline" className="text-error-500" onClick={handleBulkDelete}>
            <Trash2 className="size-4" /> Delete {selected.size} selected
          </Button>
        )}
      </div>

      <Tabs defaultValue="payouts" className="mt-6">
        <TabsList>
          <TabsTrigger value="payouts">Payout batches</TabsTrigger>
          <TabsTrigger value="methods">Method approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="payouts">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> New payout
            </Button>
          </div>

          <div className="mt-4">
            <AdminListToolbar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search payout #…"
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
                          aria-label="Select all deletable payouts"
                          disabled={deletableRows.length === 0}
                        />
                      </TableHead>
                    )}
                    <TableHead>Payout #</TableHead>
                    <TableHead>Influencer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => {
                    const isDeletable = DELETABLE_PAYOUT_STATUSES.includes(p.status);
                    return (
                      <TableRow key={p.id}>
                        {canDelete && (
                          <TableCell>
                            <Checkbox
                              checked={selected.has(p.id)}
                              onCheckedChange={(checked) => toggleOne(p.id, checked === true)}
                              aria-label={`Select ${p.payoutNumber}`}
                              disabled={!isDeletable}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-heading">{p.payoutNumber}</TableCell>
                        <TableCell>{p.influencer.profile ? `@${p.influencer.profile.username}` : p.influencer.name}</TableCell>
                        <TableCell>{p.method.replace(/_/g, " ")}</TableCell>
                        <TableCell>{formatMoney(p.totalAmount, p.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setOpenId(p.id)}>
                              Manage
                            </Button>
                            {canDelete && isDeletable && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(p)} aria-label={`Delete ${p.payoutNumber}`}>
                                <Trash2 className="size-4 text-error-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columnCount} className="text-center text-neutral-400">
                        {list.hasActiveFilters ? <EmptyState hasActiveFilters label="payouts" /> : <Badge variant="neutral">No payouts yet</Badge>}
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
        </TabsContent>

        <TabsContent value="methods">
          <PayoutMethodQueue />
        </TabsContent>
      </Tabs>

      {openId && (
        <PayoutManageDialog
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => list.reload()}
        />
      )}

      {showCreate && (
        <CreatePayoutBatchDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            list.reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

function PayoutManageDialog({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [item, setItem] = React.useState<PayoutDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pendingTransition, setPendingTransition] = React.useState<PayoutStatus | null>(null);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const { can } = usePermissions();
  const canOverride = can("influencerPayouts", "delete");
  const { confirmDelete: confirmOverride, ConfirmDialog: OverrideConfirmDialog } = useDeleteConfirmation();
  const [overrideStatus, setOverrideStatus] = React.useState<PayoutStatus | "">("");
  const [overrideNotes, setOverrideNotes] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    request<{ item: PayoutDetail }>(`/influencer-payouts/admin/${id}`)
      .then((r) => setItem(r.item))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load payout"))
      .finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function confirmTransition() {
    if (!pendingTransition) return;
    setSaving(true);
    try {
      await request(`/influencer-payouts/admin/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: pendingTransition, notes: notes || undefined }),
      });
      toast.success(`Payout moved to ${pendingTransition}`);
      setPendingTransition(null);
      setNotes("");
      load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleOverride() {
    if (!overrideStatus || !item) return;
    const target = overrideStatus;
    const from = item.status;
    const releasesBookings = target === "PENDING" || target === "CANCELLED";
    const reversingPaid = from === "PAID" && target !== "PAID";
    confirmOverride({
      title: `Override status to "${target}"?`,
      description: [
        `Moves this payout directly from "${from}" to "${target}", skipping the normal step-by-step workflow — use this only to correct a mistake.`,
        reversingPaid
          ? "Since it was marked PAID, this clears the \"processed\" record (who sent it and when). Use this if it was marked paid by mistake and the transfer never actually happened."
          : null,
        releasesBookings
          ? `The bookings bundled into ${item.payoutNumber} will be released and become eligible for a new payout batch again.`
          : null,
        "This action cannot be undone.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      onConfirm: async () => {
        await request(`/influencer-payouts/admin/${id}/status-override`, {
          method: "PATCH",
          body: JSON.stringify({ status: target, notes: overrideNotes || undefined }),
        });
        toast.success(
          releasesBookings ? `Status overridden to ${target} — bookings released for payout again` : `Status overridden to ${target}`,
        );
        setOverrideStatus("");
        setOverrideNotes("");
        load();
        onChanged();
      },
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-xl flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            {item?.payoutNumber ?? "Payout"}
            {item && <Badge variant={statusVariant(item.status)}>{item.status}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {loading || !item ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
                <div>
                  <dt className="text-label text-neutral-400">Influencer</dt>
                  <dd className="text-heading">{item.influencer.profile ? `@${item.influencer.profile.username}` : item.influencer.name}</dd>
                </div>
                <div>
                  <dt className="text-label text-neutral-400">Amount</dt>
                  <dd className="text-heading">{formatMoney(item.totalAmount, item.currency)}</dd>
                </div>
                <div>
                  <dt className="text-label text-neutral-400">Method</dt>
                  <dd className="text-heading">{item.method.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-label text-neutral-400">Processed</dt>
                  <dd className="text-heading">{item.processedAt ? `${new Date(item.processedAt).toLocaleDateString()} by ${item.processedBy?.name ?? "—"}` : "—"}</dd>
                </div>
              </div>

              <div>
                <h4 className="text-body-sm font-semibold text-heading">Payout method details (snapshot)</h4>
                <div className="mt-2 space-y-1 rounded-lg border border-neutral-200 px-3 py-2 text-body-sm">
                  {Object.entries(item.payoutDetailsSnapshot).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-neutral-400">{k}</span>
                      <span className="text-heading">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-body-sm font-semibold text-heading">Bookings included</h4>
                <ul className="mt-2 space-y-1">
                  {item.bookings.map((b) => (
                    <li key={b.booking.id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-body-sm">
                      <span>
                        {b.booking.bookingNumber} — {b.booking.businessName}
                      </span>
                      <span className="font-medium text-heading">{formatMoney(b.amount, item.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {item.notes && (
                <div>
                  <h4 className="text-body-sm font-semibold text-heading">Notes</h4>
                  <p className="mt-1 text-body-sm text-neutral-600">{item.notes}</p>
                </div>
              )}

              {item.allowedTransitions.length > 0 && (
                <div>
                  <h4 className="text-body-sm font-semibold text-heading">Move to</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.allowedTransitions.map((s) => (
                      <Button key={s} variant={pendingTransition === s ? "primary" : "outline"} size="sm" onClick={() => setPendingTransition(s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                  {pendingTransition && (
                    <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 p-4">
                      <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPendingTransition(null)} disabled={saving}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={confirmTransition} disabled={saving}>
                          {saving ? "Saving…" : `Confirm — ${pendingTransition}`}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {canOverride && (
                <div>
                  <h4 className="text-body-sm font-semibold text-heading">Admin override</h4>
                  <p className="mt-1 text-label text-neutral-400">
                    For correcting mistakes only — jump directly to any status, skipping the guided workflow above. Reversing out of
                    PAID clears the "processed" record; moving to Pending or Cancelled also releases the bundled bookings so they can
                    be paid out again.
                  </p>
                  <div className="mt-2">
                    <Select value={overrideStatus} onValueChange={(v) => setOverrideStatus(v as PayoutStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYOUT_STATUSES.filter((s) => s !== item.status).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {overrideStatus && (
                    <div className="mt-3 space-y-3 rounded-xl border border-error-200 p-4">
                      <div>
                        <Label>Note (optional)</Label>
                        <Textarea value={overrideNotes} onChange={(e) => setOverrideNotes(e.target.value)} rows={2} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setOverrideStatus("")}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="outline" className="text-error-500" onClick={handleOverride}>
                          Override — {overrideStatus}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {OverrideConfirmDialog}
    </Dialog>
  );
}

function CreatePayoutBatchDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [influencerId, setInfluencerId] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const { data: influencers } = useAsyncData<InfluencerOption[]>(
    () => request<{ items: InfluencerOption[] }>("/influencers/admin?limit=100&status=APPROVED").then((r) => r.items),
    [],
  );
  const { data: eligible, loading: loadingEligible } = useAsyncData<EligibleBooking[]>(
    () =>
      influencerId
        ? request<{ items: EligibleBooking[] }>(`/influencer-payouts/admin/eligible-bookings?influencerId=${influencerId}`).then((r) => r.items)
        : Promise.resolve([]),
    [influencerId],
  );

  React.useEffect(() => {
    setSelectedIds([]);
  }, [influencerId]);

  const total = (eligible ?? []).filter((b) => selectedIds.includes(b.id)).reduce((sum, b) => sum + Number(b.netInfluencerEarning), 0);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!influencerId || selectedIds.length === 0) {
      toast.error("Select an influencer and at least one booking");
      return;
    }
    setSaving(true);
    try {
      await request("/influencer-payouts/admin", {
        method: "POST",
        body: JSON.stringify({ influencerId, bookingIds: selectedIds, notes: notes || undefined }),
      });
      toast.success("Payout created");
      onCreated();
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
          <DialogTitle>New payout</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Combobox
            value={influencerId}
            onValueChange={setInfluencerId}
            placeholder="Select influencer"
            searchPlaceholder="Search influencers…"
            options={(influencers ?? []).map((i) => ({ value: i.id, label: i.profile ? `@${i.profile.username}` : i.name, secondary: i.name }))}
          />

          {influencerId && (
            <div>
              <p className="text-body-sm font-medium text-heading">Eligible completed bookings</p>
              {loadingEligible ? (
                <Skeleton className="mt-2 h-24 w-full" />
              ) : (eligible ?? []).length === 0 ? (
                <p className="mt-2 text-body-sm text-neutral-500">No unpaid completed bookings for this influencer.</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {(eligible ?? []).map((b) => (
                    <label key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-body-sm">
                      <span className="flex items-center gap-2">
                        <Checkbox checked={selectedIds.includes(b.id)} onCheckedChange={() => toggle(b.id)} />
                        {b.bookingNumber} — {b.businessName}
                      </span>
                      <span className="font-medium text-heading">{formatMoney(b.netInfluencerEarning)}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedIds.length > 0 && (
                <p className="mt-2 text-body-sm text-neutral-500">
                  Total: <span className="font-medium text-heading">{formatMoney(total)}</span>
                </p>
              )}
            </div>
          )}

          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !influencerId || selectedIds.length === 0}>
            {saving ? "Creating…" : "Create payout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayoutMethodQueue() {
  const [status, setStatus] = React.useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const { data: items, loading, reload } = useAsyncData<PayoutMethodQueueItem[]>(
    () => request<{ items: PayoutMethodQueueItem[] }>(`/influencer-payouts/admin/methods/queue?status=${status}`).then((r) => r.items),
    [status],
  );
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    setSavingId(id);
    try {
      await request(`/influencer-payouts/admin/methods/${id}`, { method: "PATCH", body: JSON.stringify({ status: decision }) });
      toast.success(decision === "APPROVED" ? "Payout method approved" : "Payout method rejected");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex gap-2">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <Button key={s} variant={status === s ? "primary" : "outline"} size="sm" onClick={() => setStatus(s)}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (items ?? []).length === 0 ? (
        <Badge variant="neutral">No {status.toLowerCase()} payout method requests</Badge>
      ) : (
        <div className="space-y-3">
          {(items ?? []).map((m) => (
            <div key={m.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-heading">
                    {m.influencer.profile ? `@${m.influencer.profile.username}` : m.influencer.name} — {m.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-label text-neutral-400">Submitted {new Date(m.submittedAt).toLocaleDateString()}</p>
                </div>
                {status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={savingId === m.id} onClick={() => review(m.id, "REJECTED")}>
                      Reject
                    </Button>
                    <Button size="sm" disabled={savingId === m.id} onClick={() => review(m.id, "APPROVED")}>
                      Approve
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1 text-body-sm">
                {orderedPayoutMethodDetails(m.type, m.details).map(({ key, label, value }) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-neutral-400">{label}</span>
                    <span className="text-heading">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={null}>
      <PayoutsPageInner />
    </Suspense>
  );
}
