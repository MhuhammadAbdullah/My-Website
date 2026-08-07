"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Heading,
  Pagination,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary, type FilterOption, type SortOption } from "@/components/admin-list-toolbar";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";
import type { createResourceClient } from "@/lib/api";
import { ResourceForm, type FormValues } from "./resource-form";
import type { ColumnConfig, FieldConfig } from "./types";

interface PaginatedResourceManagerProps<T extends { id: string }> {
  title: string;
  description?: string;
  resourceClient: ReturnType<typeof createResourceClient<T>>;
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  defaultValues: FormValues;
  toFormValues?: (item: T) => FormValues;
  searchPlaceholder?: string;
  sortOptions: SortOption[];
  filterOptions?: FilterOption[];
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  defaultLimit?: number;
  // Opt-in, permission-resource key (e.g. "testimonials"): only pass this for
  // a resource whose route file actually has a POST `${basePath}/bulk-delete`
  // route (see testimonials.routes.ts) -- other PaginatedResourceManager
  // consumers (team/faqs/affiliate/finance clients) are unaffected by
  // omitting it, since the checkbox column/bulk button only render when set.
  bulkDeleteResource?: string;
}

export function PaginatedResourceManager<T extends { id: string }>({
  title,
  description,
  resourceClient,
  columns,
  fields,
  defaultValues,
  toFormValues,
  searchPlaceholder,
  sortOptions,
  filterOptions = [],
  defaultSortBy = "createdAt",
  defaultSortOrder = "desc",
  defaultLimit = 10,
  bulkDeleteResource,
}: PaginatedResourceManagerProps<T>) {
  const list = usePaginatedList<T>({
    endpoint: `${resourceClient.basePath}/admin`,
    defaultSortBy,
    defaultSortOrder,
    defaultLimit,
    filterKeys: filterOptions.map((f) => f.key),
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<T | null>(null);
  const [values, setValues] = React.useState<FormValues>(defaultValues);
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const { can } = usePermissions();
  const canBulkDelete = !!bulkDeleteResource && can(bulkDeleteResource, "delete");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const rows = list.data ?? [];

  React.useEffect(() => {
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.search, list.sortBy, list.sortOrder, JSON.stringify(list.filters)]);

  function openCreate() {
    setEditing(null);
    setValues(defaultValues);
    setDialogOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setValues(toFormValues ? toFormValues(item) : (item as unknown as FormValues));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await resourceClient.update(editing.id, values as Partial<T>);
        toast.success(`${title.replace(/s$/, "")} updated`);
      } else {
        await resourceClient.create(values as Partial<T>);
        toast.success(`${title.replace(/s$/, "")} created`);
      }
      setDialogOpen(false);
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(item: T) {
    const label = title.toLowerCase().replace(/s$/, "");
    confirmDelete({
      title: `Delete this ${label}?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await resourceClient.remove(item.id);
        toast.success("Deleted");
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
    const label = title.toLowerCase().replace(/s$/, "");
    confirmDelete({
      title: `Delete ${ids.length} ${label}${ids.length === 1 ? "" : "s"}?`,
      description: `Permanently removes all ${ids.length} selected ${label}${ids.length === 1 ? "" : "s"}.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        const res = await resourceClient.bulkDelete(ids);
        toast.success(`${res.count} ${label}${res.count === 1 ? "" : "s"} deleted`);
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>{title}</Heading>
          {description && <p className="mt-1 text-body-sm text-neutral-500">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {canBulkDelete && selected.size > 0 && (
            <Button variant="outline" className="text-error-500" onClick={handleBulkDelete}>
              <Trash2 className="size-4" /> Delete {selected.size} selected
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus /> Add new
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder={searchPlaceholder}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={sortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={filterOptions}
          onFilterChange={list.setFilter}
          limit={list.limit}
          onLimitChange={list.setLimit}
          hasActiveFilters={list.hasActiveFilters}
          onClearFilters={list.clearFilters}
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : list.error ? (
          <p className="text-center text-body-sm text-error-500">{list.error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {canBulkDelete && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleAll(checked === true)}
                      aria-label={`Select all ${title.toLowerCase()}`}
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id}>
                  {canBulkDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={(checked) => toggleOne(item.id, checked === true)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit">
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} aria-label="Delete">
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + (canBulkDelete ? 2 : 1)}>
                    <EmptyState hasActiveFilters={list.hasActiveFilters} label={title.toLowerCase()} />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col p-0">
          <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
            <DialogTitle>{editing ? `Edit ${title.toLowerCase().replace(/s$/, "")}` : `New ${title.toLowerCase().replace(/s$/, "")}`}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <ResourceForm fields={fields} values={values} onChange={setValues} />
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 px-5 py-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}
