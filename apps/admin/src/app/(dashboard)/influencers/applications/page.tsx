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
  Label,
  Pagination,
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
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";

interface ApplicationListItem {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_MORE_INFO" | "SUSPENDED";
  appliedAt: string;
  reviewedAt: string | null;
  identityDocumentType: string | null;
  profile: { username: string; city: string | null; countryCode: string | null; categories: { name: string }[] } | null;
}

interface Platform {
  id: string;
  platform: string;
  handle: string | null;
  profileUrl: string | null;
  followers: number;
  engagementRate: string;
}

interface PayoutMethodSummary {
  id: string;
  type: string;
  details: Record<string, string>;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
}

interface ApplicationDetail extends ApplicationListItem {
  rejectionReason: string | null;
  identityDocumentUrl: string | null;
  payoutMethods: PayoutMethodSummary[];
  profile:
    | (ApplicationListItem["profile"] & {
        tagline: string | null;
        bio: string | null;
        languages: string[];
        preferredPayoutMethod: string | null;
        introVideo: { url: string } | null;
        platforms: Platform[];
      })
    | null;
}

const statusOptions = ["PENDING", "APPROVED", "REJECTED", "NEEDS_MORE_INFO", "SUSPENDED"];
const statusFilterOptions = statusOptions.map((v) => ({ value: v, label: v.replace(/_/g, " ") }));
const sortOptions = [
  { value: "appliedAt", label: "Date applied" },
  { value: "reviewedAt", label: "Date reviewed" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];

const statusBadgeVariant: Record<ApplicationListItem["status"], "warning" | "success" | "error" | "accent"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  NEEDS_MORE_INFO: "accent",
  SUSPENDED: "error",
};

const payoutStatusVariant: Record<PayoutMethodSummary["status"], "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

function ApplicationsPageInner() {
  const list = usePaginatedList<ApplicationListItem>({
    endpoint: "/influencer-applications/admin",
    defaultSortBy: "appliedAt",
    defaultSortOrder: "desc",
    filterKeys: ["status"],
  });
  const [openId, setOpenId] = React.useState<string | null>(null);
  const { can } = usePermissions();
  const canDelete = can("influencerApplications", "delete");
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const rows = list.data ?? [];

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

  function handleDelete(app: ApplicationListItem) {
    confirmDelete({
      title: "Delete this application?",
      description: `This permanently deletes ${app.name}'s account, login, and all submitted profile data — not just the application entry. They would need to apply again from scratch to rejoin.\n\nIf they have any bookings or payouts, deletion is blocked (that history can't be erased) — reject the application instead.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`/influencer-applications/admin/${app.id}`, { method: "DELETE" });
        toast.success("Application and account deleted");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(app.id);
          return next;
        });
        afterDelete(1);
      },
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    confirmDelete({
      title: `Delete ${ids.length} application${ids.length === 1 ? "" : "s"}?`,
      description: `This permanently deletes all ${ids.length} account${ids.length === 1 ? "" : "s"}, logins, and submitted profile data — not just the application entries. They would need to apply again to rejoin.\n\nThe whole selection is blocked if even one of them has any bookings or payouts (real business history can't be erased) — reject those instead.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        const res = await request<{ count: number }>("/influencer-applications/admin/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} account${res.count === 1 ? "" : "s"} deleted`);
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

  const columnCount = canDelete ? 9 : 8;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level={2}>Influencer Applications</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Review "Become an Influencer" submissions. Approving one publishes their profile and gives them dashboard access.
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
          searchPlaceholder="Search applications…"
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
                      aria-label="Select all applications"
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((app) => (
                <TableRow key={app.id}>
                  {canDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(app.id)}
                        onCheckedChange={(checked) => toggleOne(app.id, checked === true)}
                        aria-label={`Select ${app.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>{app.name}</TableCell>
                  <TableCell>{app.profile ? `@${app.profile.username}` : "—"}</TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell>
                    {[app.profile?.city, app.profile?.countryCode].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {app.profile?.categories.map((c) => c.name).join(", ") || "—"}
                  </TableCell>
                  <TableCell>{new Date(app.appliedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[app.status]}>{app.status.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setOpenId(app.id)}>
                        Review
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(app)} aria-label={`Delete ${app.name}`}>
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
                    {list.hasActiveFilters ? (
                      <EmptyState hasActiveFilters label="applications" />
                    ) : (
                      <Badge variant="neutral">No applications yet</Badge>
                    )}
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
        <ApplicationReviewDialog
          id={openId}
          onClose={() => setOpenId(null)}
          onDecided={() => {
            setOpenId(null);
            list.reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

function ApplicationReviewDialog({ id, onClose, onDecided }: { id: string; onClose: () => void; onDecided: () => void }) {
  const [app, setApp] = React.useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    request<{ item: ApplicationDetail }>(`/influencer-applications/admin/${id}`)
      .then((r) => setApp(r.item))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load application"))
      .finally(() => setLoading(false));
  }, [id]);

  async function decide(status: "APPROVED" | "REJECTED" | "NEEDS_MORE_INFO") {
    setSubmitting(status);
    try {
      await request(`/influencer-applications/admin/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      });
      toast.success(
        status === "APPROVED" ? "Application approved" : status === "REJECTED" ? "Application rejected" : "Requested more information",
      );
      onDecided();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>{app ? app.name : "Application"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading || !app ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant={statusBadgeVariant[app.status]}>{app.status.replace(/_/g, " ")}</Badge>
                {app.profile && <span className="text-body-sm text-neutral-500">@{app.profile.username}</span>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-label uppercase text-neutral-400">Email</p>
                  <p className="text-body-sm">{app.email}</p>
                </div>
                <div>
                  <p className="text-label uppercase text-neutral-400">Location</p>
                  <p className="text-body-sm">{[app.profile?.city, app.profile?.countryCode].filter(Boolean).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-label uppercase text-neutral-400">Languages</p>
                  <p className="text-body-sm">{app.profile?.languages.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-label uppercase text-neutral-400">Preferred payout method</p>
                  <p className="text-body-sm">{app.profile?.preferredPayoutMethod ?? "—"}</p>
                </div>
              </div>

              {app.profile?.tagline && (
                <div>
                  <p className="text-label uppercase text-neutral-400">Tagline</p>
                  <p className="text-body-sm">{app.profile.tagline}</p>
                </div>
              )}
              {app.profile?.bio && (
                <div>
                  <p className="text-label uppercase text-neutral-400">Bio</p>
                  <p className="text-body-sm whitespace-pre-wrap">{app.profile.bio}</p>
                </div>
              )}

              {app.profile?.categories && app.profile.categories.length > 0 && (
                <div>
                  <p className="text-label uppercase text-neutral-400">Categories</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {app.profile.categories.map((c) => (
                      <Badge key={c.name} variant="neutral">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {app.profile && app.profile.platforms.length > 0 && (
                <div>
                  <p className="text-label uppercase text-neutral-400">Platforms</p>
                  <div className="mt-1.5 overflow-hidden rounded-lg border border-neutral-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Platform</TableHead>
                          <TableHead>Handle</TableHead>
                          <TableHead>Followers</TableHead>
                          <TableHead>Engagement</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {app.profile.platforms.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.platform}</TableCell>
                            <TableCell>{p.handle || "—"}</TableCell>
                            <TableCell>{p.followers.toLocaleString()}</TableCell>
                            <TableCell>{p.engagementRate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {app.profile?.introVideo && (
                <div>
                  <p className="text-label uppercase text-neutral-400">Introduction video</p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption -- freshly-uploaded applicant video, no caption track exists */}
                  <video src={app.profile.introVideo.url} controls className="mt-1.5 max-h-64 rounded-lg border border-neutral-200" />
                </div>
              )}

              {app.payoutMethods.length > 0 && (
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-label uppercase text-neutral-400">Creator payout</p>
                    <Badge variant={payoutStatusVariant[app.payoutMethods[0]!.status]}>{app.payoutMethods[0]!.status}</Badge>
                  </div>
                  <div className="mt-1.5 space-y-1 rounded-lg border border-neutral-200 px-3 py-2 text-body-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Method</span>
                      <span className="text-heading">{app.payoutMethods[0]!.type.replace(/_/g, " ")}</span>
                    </div>
                    {Object.entries(app.payoutMethods[0]!.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-neutral-400">{k}</span>
                        <span className="text-heading">{v}</span>
                      </div>
                    ))}
                  </div>
                  {app.payoutMethods[0]!.status === "PENDING" && (
                    <p className="mt-1.5 text-label text-neutral-400">Becomes active automatically once this application is approved.</p>
                  )}
                </div>
              )}

              {(app.identityDocumentType || app.identityDocumentUrl) && (
                <div>
                  <p className="text-label uppercase text-neutral-400">Identity document ({app.identityDocumentType ?? "—"})</p>
                  {app.identityDocumentUrl ? (
                    // Signed, single-use URL -- deliberately not run through Next's
                    // image proxy/cache, since it's freshly generated per request.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={app.identityDocumentUrl}
                      alt="Identity document"
                      className="mt-1.5 max-h-64 rounded-lg border border-neutral-200 object-contain"
                    />
                  ) : (
                    <p className="text-body-sm text-neutral-400">Not provided</p>
                  )}
                </div>
              )}

              {app.rejectionReason && (
                <div>
                  <p className="text-label uppercase text-neutral-400">Previous rejection reason</p>
                  <p className="text-body-sm">{app.rejectionReason}</p>
                </div>
              )}

              <div>
                <Label>Note (optional — sent to the applicant for rejections and info requests)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>
            </div>
          )}
        </div>

        {app && app.status !== "APPROVED" && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-neutral-200 px-5 py-4">
            <Button variant="outline" disabled={!!submitting} onClick={() => decide("NEEDS_MORE_INFO")}>
              {submitting === "NEEDS_MORE_INFO" ? "Saving…" : "Request more info"}
            </Button>
            <Button
              variant="outline"
              className="text-error-500"
              disabled={!!submitting}
              onClick={() => decide("REJECTED")}
            >
              {submitting === "REJECTED" ? "Saving…" : "Reject"}
            </Button>
            <Button disabled={!!submitting} onClick={() => decide("APPROVED")}>
              {submitting === "APPROVED" ? "Saving…" : "Approve"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationsPageInner />
    </Suspense>
  );
}
