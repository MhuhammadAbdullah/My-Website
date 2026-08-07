"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react";
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
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";

interface ReviewSummary {
  influencer: { id: string; name: string; username: string | null; profilePhoto: { url: string } | null };
  totalReviews: number;
  publishedReviews: number;
  averageRating: number;
  breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
}

interface ReviewItem {
  id: string;
  authorName: string;
  authorCompany: string | null;
  rating: number;
  comment: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
}

const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-4 ${i < rating ? "fill-current text-warning-500" : "text-neutral-200"}`} />
      ))}
    </div>
  );
}

export default function InfluencerReviewDetailPage() {
  const params = useParams<{ influencerId: string }>();
  const router = useRouter();
  const influencerId = params.influencerId;

  const { data: summary, loading: summaryLoading, reload: reloadSummary } = useAsyncData<ReviewSummary>(
    () => request<ReviewSummary>(`/influencer-reviews/admin/summary/${influencerId}`),
    [influencerId],
  );

  // Lazy-loaded, paginated -- an influencer with hundreds of reviews never
  // loads them all at once, just the current page (see brief: "Review
  // detail page lazy load ho").
  const list = usePaginatedList<ReviewItem>({
    endpoint: `/influencer-reviews/admin?influencerId=${influencerId}`,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    defaultLimit: 10,
  });
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const { can } = usePermissions();
  const canDelete = can("influencers", "delete");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [dialogItem, setDialogItem] = React.useState<ReviewItem | null | "new">(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.search, list.sortBy, list.sortOrder, JSON.stringify(list.filters)]);

  function reloadAll() {
    reloadSummary();
    list.reload();
  }

  async function handleTogglePublish(item: ReviewItem) {
    setTogglingId(item.id);
    try {
      await request(`/influencer-reviews/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          influencerId,
          authorName: item.authorName,
          authorCompany: item.authorCompany || undefined,
          rating: item.rating,
          comment: item.comment,
          status: item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
        }),
      });
      toast.success(item.status === "PUBLISHED" ? "Review unpublished" : "Review published");
      reloadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setTogglingId(null);
    }
  }

  function handleDelete(item: ReviewItem) {
    confirmDelete({
      title: `Delete this review by "${item.authorName}"?`,
      description: `Removes the review immediately (if it was Published, it disappears from the public profile right away). The influencer's average rating and review count will be recalculated without it.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`/influencer-reviews/${item.id}`, { method: "DELETE" });
        toast.success("Review deleted, rating recalculated");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        reloadAll();
      },
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    confirmDelete({
      title: `Delete ${ids.length} review${ids.length === 1 ? "" : "s"}?`,
      description: `Removes all ${ids.length} selected reviews immediately (any that were Published disappear from the public profile right away). Affected influencers' average ratings and review counts will be recalculated without them.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        const res = await request<{ count: number }>("/influencer-reviews/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} review${res.count === 1 ? "" : "s"} deleted, ratings recalculated`);
        setSelected(new Set());
        reloadAll();
      },
    });
  }

  const rows = list.data ?? [];
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

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.push("/influencers/reviews")} className="mb-4">
        <ArrowLeft /> Back to reviews
      </Button>

      {summaryLoading || !summary ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="rounded-2xl border border-neutral-200 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {summary.influencer.profilePhoto ? (
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                  <Image src={summary.influencer.profilePhoto.url} alt="" fill className="object-cover" sizes="56px" />
                </div>
              ) : (
                <div className="size-14 shrink-0 rounded-full bg-neutral-100" />
              )}
              <div>
                <Heading level={2}>{summary.influencer.name}</Heading>
                {summary.influencer.username && <p className="text-body-sm text-neutral-400">@{summary.influencer.username}</p>}
              </div>
            </div>
            <Button onClick={() => setDialogItem("new")}>
              <Plus /> Add review
            </Button>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center rounded-xl bg-neutral-50 px-8 py-4 text-center">
              <p className="text-h2 font-semibold text-heading">{summary.averageRating.toFixed(1)}</p>
              <Stars rating={Math.round(summary.averageRating)} />
              <p className="mt-1 text-label text-neutral-400">
                {summary.totalReviews} review{summary.totalReviews === 1 ? "" : "s"} · {summary.publishedReviews} published
              </p>
            </div>

            <div className="space-y-1.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = summary.breakdown[String(star) as "1" | "2" | "3" | "4" | "5"] ?? 0;
                const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-10 shrink-0 text-label text-neutral-500">{star}★</span>
                    <Progress value={pct} className="flex-1" label={`${star} star reviews`} />
                    <span className="w-8 shrink-0 text-right text-label text-neutral-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading level={3}>Reviews</Heading>
          {canDelete && selected.size > 0 && (
            <Button variant="outline" className="text-error-500" onClick={handleBulkDelete}>
              <Trash2 className="size-4" /> Delete {selected.size} selected
            </Button>
          )}
        </div>

        {canDelete && rows.length > 0 && !list.loading && (
          <label className="mt-3 flex items-center gap-2 text-body-sm text-neutral-500">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(checked) => toggleAll(checked === true)}
              aria-label="Select all reviews"
            />
            Select all
          </label>
        )}

        <div className="mt-4">
          {list.loading ? (
            <Skeleton className="h-64 w-full" />
          ) : list.error ? (
            <p className="text-center text-body-sm text-error-500">{list.error}</p>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">No reviews yet.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {canDelete && (
                        <Checkbox
                          className="mt-1"
                          checked={selected.has(r.id)}
                          onCheckedChange={(checked) => toggleOne(r.id, checked === true)}
                          aria-label={`Select review by ${r.authorName}`}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-heading">
                            {r.authorName}
                            {r.authorCompany ? <span className="font-normal text-neutral-400">, {r.authorCompany}</span> : null}
                          </p>
                          <Badge variant={r.status === "PUBLISHED" ? "success" : r.status === "DRAFT" ? "warning" : "neutral"}>
                            {r.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Stars rating={r.rating} />
                          <span className="text-label text-neutral-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={togglingId === r.id}
                        onClick={() => handleTogglePublish(r)}
                      >
                        {r.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDialogItem(r)}>
                        Edit
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="text-error-500" onClick={() => handleDelete(r)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-body-sm text-body">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="mt-6 flex justify-center">
            <Pagination page={list.page} totalPages={list.meta?.totalPages ?? 1} onPageChange={list.setPage} />
          </div>
        )}
      </div>

      {dialogItem && (
        <ReviewDialog
          influencerId={influencerId}
          item={dialogItem === "new" ? null : dialogItem}
          onClose={() => setDialogItem(null)}
          onSaved={() => {
            setDialogItem(null);
            reloadAll();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

interface ReviewFormState {
  authorName: string;
  authorCompany: string;
  rating: string;
  comment: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

function ReviewDialog({
  influencerId,
  item,
  onClose,
  onSaved,
}: {
  influencerId: string;
  item: ReviewItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<ReviewFormState>({
    authorName: item?.authorName ?? "",
    authorCompany: item?.authorCompany ?? "",
    rating: String(item?.rating ?? 5),
    comment: item?.comment ?? "",
    status: item?.status ?? "PUBLISHED",
  });
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.authorName.trim()) {
      toast.error("Author name is required");
      return;
    }
    if (!form.comment.trim()) {
      toast.error("Review text is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        influencerId,
        authorName: form.authorName,
        authorCompany: form.authorCompany.trim() || undefined,
        rating: Number(form.rating),
        comment: form.comment,
        status: form.status,
      };
      if (item) {
        await request(`/influencer-reviews/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("Review updated");
      } else {
        await request("/influencer-reviews", { method: "POST", body: JSON.stringify(body) });
        toast.success("Review created");
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
          <DialogTitle>{item ? "Edit review" : "Add review"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <Label>Author name</Label>
            <Input value={form.authorName} onChange={(e) => set("authorName", e.target.value)} placeholder="e.g. Sara Khan" />
          </div>

          <div>
            <Label>Author company (optional)</Label>
            <Input value={form.authorCompany} onChange={(e) => set("authorCompany", e.target.value)} placeholder="e.g. Bloom Cosmetics" />
          </div>

          <div>
            <Label>Rating (1–5)</Label>
            <Select value={form.rating} onValueChange={(v) => set("rating", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} star{n === 1 ? "" : "s"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Review text</Label>
            <Textarea value={form.comment} onChange={(e) => set("comment", e.target.value)} rows={4} />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as ReviewFormState["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
