"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
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
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";
import { slugify } from "@agency/utils";
import { TechnologiesList } from "./technologies-list";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
}

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "order", label: "Sort order" },
  { value: "createdAt", label: "Date created" },
  { value: "updatedAt", label: "Date updated" },
];

// `bulkDeleteResource` is opt-in: only the influencer-categories tab passes
// it (its own `${endpoint}/bulk-delete` route exists -- see
// categories.routes.ts). Services/Projects/Affiliate tabs are left alone
// (own routers, no bulk-delete route added) rather than risk a bulk-delete
// button that 404s on those.
function CategoryList({
  endpoint,
  paramPrefix,
  label,
  bulkDeleteResource,
}: {
  endpoint: string;
  paramPrefix: string;
  label: string;
  bulkDeleteResource?: string;
}) {
  const list = usePaginatedList<CategoryItem>({
    endpoint: `${endpoint}/admin`,
    paramPrefix,
    defaultSortBy: "order",
    defaultSortOrder: "asc",
  });
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editSlug, setEditSlug] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const { can } = usePermissions();
  const canBulkDelete = !!bulkDeleteResource && can(bulkDeleteResource, "delete");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const rows = list.data ?? [];

  React.useEffect(() => {
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.search, list.sortBy, list.sortOrder, JSON.stringify(list.filters)]);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await request(endpoint, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), slug: slugify(name) }),
      });
      setName("");
      toast.success(`${label} added`);
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(item: CategoryItem) {
    confirmDelete({
      title: `Delete "${item.name}"?`,
      description: `Anything currently tagged with this ${label.toLowerCase()} will no longer show under it — the ${label.toLowerCase()} itself is removed, not what was tagged.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`${endpoint}/${item.id}`, { method: "DELETE" });
        toast.success(`${label} deleted`);
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
      title: `Delete ${ids.length} ${label.toLowerCase()}${ids.length === 1 ? "" : "s"}?`,
      description: `Anything currently tagged with these ${label.toLowerCase()}s will no longer show under them — only the ${label.toLowerCase()}s themselves are removed.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        const res = await request<{ count: number }>(`${endpoint}/bulk-delete`, {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} ${label.toLowerCase()}${res.count === 1 ? "" : "s"} deleted`);
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

  async function handleToggleEnabled(item: CategoryItem, checked: boolean) {
    try {
      await request(`${endpoint}/${item.id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: checked }) });
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  function openEdit(item: CategoryItem) {
    setEditing(item);
    setEditName(item.name);
    setEditSlug(item.slug);
  }

  async function handleSaveEdit() {
    if (!editing || !editName.trim() || !editSlug.trim()) return;
    setEditSaving(true);
    try {
      await request(`${endpoint}/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
      });
      toast.success(`${label} updated`);
      setEditing(null);
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`New ${label.toLowerCase()} name…`}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="flex-1"
        />
        <Button onClick={handleCreate} disabled={saving}>
          <Plus /> Add
        </Button>
        {canBulkDelete && selected.size > 0 && (
          <Button variant="outline" className="text-error-500" onClick={handleBulkDelete}>
            <Trash2 className="size-4" /> Delete {selected.size} selected
          </Button>
        )}
      </div>

      <div className="mt-4">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder={`Search ${label.toLowerCase()}s…`}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={sortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          onFilterChange={() => {}}
          limit={list.limit}
          onLimitChange={list.setLimit}
          hasActiveFilters={list.hasActiveFilters}
          onClearFilters={list.clearFilters}
        />
      </div>

      {canBulkDelete && rows.length > 0 && !list.loading && (
        <label className="mt-3 flex items-center gap-2 text-body-sm text-neutral-500">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => toggleAll(checked === true)}
            aria-label={`Select all ${label.toLowerCase()}s`}
          />
          Select all
        </label>
      )}

      <div className="mt-4 space-y-2">
        {list.loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : rows.length === 0 ? (
          <EmptyState hasActiveFilters={list.hasActiveFilters} label={`${label.toLowerCase()}s`} />
        ) : (
          rows.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <div className="flex items-center gap-3">
                {canBulkDelete && (
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={(checked) => toggleOne(item.id, checked === true)}
                    aria-label={`Select ${item.name}`}
                  />
                )}
                <div>
                  <p className="text-body-sm font-medium text-heading">{item.name}</p>
                  <p className="font-mono text-label text-neutral-400">/{item.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={item.isEnabled}
                  onCheckedChange={(checked) => handleToggleEnabled(item, checked)}
                  aria-label={item.isEnabled ? "Disable" : "Enable"}
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit">
                  <Pencil className="size-4 text-neutral-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} aria-label="Delete">
                  <Trash2 className="size-4 text-error-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {!list.loading && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <ListSummary meta={list.meta} />
          <Pagination page={list.page} totalPages={list.meta?.totalPages ?? 1} onPageChange={list.setPage} />
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {label.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
            </div>
            <Button onClick={handleSaveEdit} disabled={editSaving} className="w-full">
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}

function CategoriesPageInner() {
  // Lets the Influencer Marketplace nav group deep-link straight to its own
  // categories (?tab=influencers) instead of landing on "Services" and
  // making the admin click over manually.
  const initialTab = useSearchParams().get("tab") ?? "services";

  return (
    <div>
      <Heading level={2}>Categories</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">
        Organize services, portfolio projects, technologies, affiliate tools, and influencer marketplace categories.
      </p>

      <Tabs defaultValue={initialTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="services">Service categories</TabsTrigger>
          <TabsTrigger value="projects">Project categories</TabsTrigger>
          <TabsTrigger value="technologies">Technologies</TabsTrigger>
          <TabsTrigger value="affiliate">Affiliate categories</TabsTrigger>
          <TabsTrigger value="influencers">Influencer categories</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <CategoryList endpoint="/categories/services" paramPrefix="svc" label="Category" />
        </TabsContent>
        <TabsContent value="projects">
          <CategoryList endpoint="/categories/projects" paramPrefix="proj" label="Category" />
        </TabsContent>
        <TabsContent value="technologies">
          <TechnologiesList />
        </TabsContent>
        <TabsContent value="affiliate">
          <CategoryList endpoint="/affiliate/categories" paramPrefix="aff" label="Category" />
        </TabsContent>
        <TabsContent value="influencers">
          <CategoryList endpoint="/categories/influencers" paramPrefix="inf" label="Category" bulkDeleteResource="influencerCategories" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={null}>
      <CategoriesPageInner />
    </Suspense>
  );
}
