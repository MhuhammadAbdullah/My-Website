"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, Plus, Star } from "lucide-react";
import {
  Badge,
  Button,
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
  Textarea,
  toast,
} from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useAsyncData } from "@/lib/use-resource";

// One row per influencer (aggregated via GROUP BY on the API side, see
// influencer-reviews.routes.ts's /admin/summary) -- individual reviews only
// ever show on the per-influencer detail page at
// /influencers/reviews/[influencerId], never as separate rows here.
interface ReviewSummaryItem {
  influencerId: string;
  name: string;
  username: string | null;
  profilePhoto: { url: string } | null;
  totalReviews: number;
  publishedReviews: number;
  averageRating: number;
  latestReviewDate: string | null;
}

interface InfluencerOption {
  id: string;
  name: string;
  profile: { username: string } | null;
}

const sortOptions = [
  { value: "latestReviewDate", label: "Latest review" },
  { value: "totalReviews", label: "Total reviews" },
  { value: "averageRating", label: "Average rating" },
];

const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

function InfluencerReviewsPageInner() {
  const list = usePaginatedList<ReviewSummaryItem>({
    endpoint: "/influencer-reviews/admin/summary",
    defaultSortBy: "latestReviewDate",
    defaultSortOrder: "desc",
  });
  const [showNew, setShowNew] = React.useState(false);
  const rows = list.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Influencer Reviews</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Testimonials shown at the bottom of each influencer's public profile. One row per influencer — open "View Reviews" to see and
            manage their individual reviews.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus /> New review
        </Button>
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search influencer name or username…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={sortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
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
                <TableHead>Influencer</TableHead>
                <TableHead>Total Reviews</TableHead>
                <TableHead>Average Rating</TableHead>
                <TableHead>Latest Review</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.influencerId}>
                  <TableCell className="font-medium text-heading">
                    <div className="flex items-center gap-2">
                      {r.profilePhoto ? (
                        <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                          <Image src={r.profilePhoto.url} alt="" fill className="object-cover" sizes="32px" />
                        </div>
                      ) : (
                        <div className="size-8 shrink-0 rounded-full bg-neutral-100" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate">{r.name}</p>
                        {r.username && <p className="truncate text-label text-neutral-400">@{r.username}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{r.totalReviews}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Star className="size-3.5 fill-current text-warning-500" />
                      {r.averageRating.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-neutral-500">
                    {r.latestReviewDate ? new Date(r.latestReviewDate).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.publishedReviews > 0 ? "success" : "neutral"}>
                      {r.publishedReviews}/{r.totalReviews} published
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/influencers/reviews/${r.influencerId}`}>
                        <Eye /> View Reviews
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-neutral-400">
                    {list.hasActiveFilters ? <EmptyState hasActiveFilters label="reviews" /> : <Badge variant="neutral">No reviews yet</Badge>}
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

      {showNew && (
        <NewReviewDialog
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            list.reload();
          }}
        />
      )}
    </div>
  );
}

interface ReviewFormState {
  influencerId: string;
  authorName: string;
  authorCompany: string;
  rating: string;
  comment: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

function NewReviewDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState<ReviewFormState>({
    influencerId: "",
    authorName: "",
    authorCompany: "",
    rating: "5",
    comment: "",
    status: "PUBLISHED",
  });
  const [saving, setSaving] = React.useState(false);

  const { data: influencers } = useAsyncData<InfluencerOption[]>(
    () => request<{ items: InfluencerOption[] }>("/influencers/admin?limit=100&status=APPROVED").then((r) => r.items),
    [],
  );

  function set<K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.influencerId) {
      toast.error("Select an influencer");
      return;
    }
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
      await request("/influencer-reviews", {
        method: "POST",
        body: JSON.stringify({
          influencerId: form.influencerId,
          authorName: form.authorName,
          authorCompany: form.authorCompany.trim() || undefined,
          rating: Number(form.rating),
          comment: form.comment,
          status: form.status,
        }),
      });
      toast.success("Review created");
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
          <DialogTitle>New review</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <Label>Influencer</Label>
            <Combobox
              value={form.influencerId}
              onValueChange={(v) => set("influencerId", v)}
              placeholder="Select influencer"
              searchPlaceholder="Search influencers…"
              options={(influencers ?? []).map((i) => ({ value: i.id, label: i.profile ? `@${i.profile.username}` : i.name }))}
            />
          </div>

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

export default function InfluencerReviewsPage() {
  return (
    <Suspense fallback={null}>
      <InfluencerReviewsPageInner />
    </Suspense>
  );
}
