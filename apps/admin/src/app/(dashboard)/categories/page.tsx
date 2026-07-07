"use client";

import * as React from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  Button,
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
import { slugify } from "@agency/utils";

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

function CategoryList({ endpoint, paramPrefix, label }: { endpoint: string; paramPrefix: string; label: string }) {
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

  function handleDelete(id: string) {
    confirmDelete({
      title: `Delete this ${label.toLowerCase()}?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`${endpoint}/${id}`, { method: "DELETE" });
        toast.success("Deleted");
        list.reload();
      },
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
      <div className="flex gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`New ${label.toLowerCase()} name…`}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={saving}>
          <Plus /> Add
        </Button>
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

      <div className="mt-4 space-y-2">
        {list.loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState hasActiveFilters={list.hasActiveFilters} label={`${label.toLowerCase()}s`} />
        ) : (
          list.data!.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <div>
                <p className="text-body-sm font-medium text-heading">{item.name}</p>
                <p className="font-mono text-label text-neutral-400">/{item.slug}</p>
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
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} aria-label="Delete">
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

export default function CategoriesPage() {
  return (
    <div>
      <Heading level={2}>Categories</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">
        Organize services, portfolio projects, technologies, and affiliate tools.
      </p>

      <Tabs defaultValue="services" className="mt-6">
        <TabsList>
          <TabsTrigger value="services">Service categories</TabsTrigger>
          <TabsTrigger value="projects">Project categories</TabsTrigger>
          <TabsTrigger value="technologies">Technologies</TabsTrigger>
          <TabsTrigger value="affiliate">Affiliate categories</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <CategoryList endpoint="/categories/services" paramPrefix="svc" label="Category" />
        </TabsContent>
        <TabsContent value="projects">
          <CategoryList endpoint="/categories/projects" paramPrefix="proj" label="Category" />
        </TabsContent>
        <TabsContent value="technologies">
          <CategoryList endpoint="/categories/technologies" paramPrefix="tech" label="Technology" />
        </TabsContent>
        <TabsContent value="affiliate">
          <CategoryList endpoint="/affiliate/categories" paramPrefix="aff" label="Category" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
