"use client";

import * as React from "react";
import { Suspense } from "react";
import { Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Heading,
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
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  message: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "CLOSED" | "ARCHIVED";
  createdAt: string;
}

const statusOptions = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED", "ARCHIVED"];
const statusFilterOptions = statusOptions.map((v) => ({ value: v, label: v }));
const sortOptions = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Date received" },
  { value: "updatedAt", label: "Date updated" },
];

function AnalyticsPageInner() {
  const list = usePaginatedList<Submission>({
    endpoint: "/contact",
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    filterKeys: ["status", "country"],
  });
  const { can } = usePermissions();
  const canDelete = can("settings", "delete");
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const rows = list.data ?? [];

  // Row selection is scoped to the current page — drop it whenever the page
  // itself, or anything that reshuffles which rows are on it, changes.
  React.useEffect(() => {
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.search, list.sortBy, list.sortOrder, JSON.stringify(list.filters)]);

  async function updateStatus(id: string, status: string) {
    try {
      await request(`/contact/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast.success("Updated");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

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

  function handleDelete(sub: Submission) {
    confirmDelete({
      title: "Delete this message?",
      description: `Delete the message from ${sub.name}?\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`/contact/${sub.id}`, { method: "DELETE" });
        toast.success("Message deleted");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(sub.id);
          return next;
        });
        afterDelete(1);
      },
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    confirmDelete({
      title: `Delete ${ids.length} message${ids.length === 1 ? "" : "s"}?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        const res = await request<{ count: number }>("/contact/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} message${res.count === 1 ? "" : "s"} deleted`);
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

  const columnCount = canDelete ? 10 : 8;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level={2}>Messages</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Contact form submissions received through the website.
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
          searchPlaceholder="Search name, email, or message…"
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
                      aria-label="Select all messages"
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                {canDelete && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((sub) => (
                <TableRow key={sub.id}>
                  {canDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(sub.id)}
                        onCheckedChange={(checked) => toggleOne(sub.id, checked === true)}
                        aria-label={`Select message from ${sub.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>{sub.name}</TableCell>
                  <TableCell>{sub.email}</TableCell>
                  <TableCell>{sub.phone}</TableCell>
                  <TableCell>{sub.country}</TableCell>
                  <TableCell>{sub.city}</TableCell>
                  <TableCell className="max-w-xs truncate">{sub.message}</TableCell>
                  <TableCell>{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Select value={sub.status} onValueChange={(status) => updateStatus(sub.id, status)}>
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(sub)}
                        aria-label="Delete message"
                      >
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-neutral-400">
                    {list.hasActiveFilters ? (
                      <EmptyState hasActiveFilters label="messages" />
                    ) : (
                      <Badge variant="neutral">No messages yet</Badge>
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

      {ConfirmDialog}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsPageInner />
    </Suspense>
  );
}
