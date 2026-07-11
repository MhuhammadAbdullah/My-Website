"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  toast,
} from "@agency/ui";
import { TECH_STACK_DISPLAY_MODES, type TechStackDisplayMode } from "@agency/types";
import { slugify } from "@agency/utils";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { useAsyncData } from "@/lib/use-resource";
import { LogoField, type LogoValue } from "@/components/logo-field";

interface TechnologyItem {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  order: number;
  logo: { id: string; url: string } | null;
}

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "order", label: "Sort order" },
  { value: "createdAt", label: "Date created" },
  { value: "updatedAt", label: "Date updated" },
];

const DISPLAY_STYLE_LABELS: Record<TechStackDisplayMode, string> = {
  TAGS: "Static Tags",
  MARQUEE: "Logo Marquee",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function TechLogoThumb({ tech }: { tech: TechnologyItem }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
      {tech.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset
        <img src={tech.logo.url} alt="" className="size-full object-contain p-1" />
      ) : (
        <span className="font-mono text-label text-neutral-400">{initials(tech.name)}</span>
      )}
    </div>
  );
}

// Scoped to this tab per the spec ("inside the Technologies management
// section") rather than the general Settings page — it only affects how
// Home/About render the Technology list, so it lives next to that data.
function DisplayStyleSelector() {
  const { data, loading, reload } = useAsyncData(() =>
    request<{ settings: Record<string, unknown> }>("/settings"),
  );
  const [saving, setSaving] = React.useState(false);
  const value = (data?.settings.tech_stack_display as TechStackDisplayMode | undefined) ?? "TAGS";

  async function handleChange(next: TechStackDisplayMode) {
    setSaving(true);
    try {
      await request("/settings/tech_stack_display", { method: "PUT", body: JSON.stringify({ value: next }) });
      toast.success("Display style updated");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <Label>Display style</Label>
      <p className="mt-1 text-body-sm text-neutral-500">
        Choose how the technology stack appears on the Home and About pages.
      </p>
      <div className="mt-3 max-w-xs">
        {loading ? (
          <Skeleton className="h-11 w-full" />
        ) : (
          <Select value={value} onValueChange={(v) => handleChange(v as TechStackDisplayMode)} disabled={saving}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TECH_STACK_DISPLAY_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {DISPLAY_STYLE_LABELS[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

export function TechnologiesList() {
  const list = usePaginatedList<TechnologyItem>({
    endpoint: "/categories/technologies/admin",
    paramPrefix: "tech",
    defaultSortBy: "order",
    defaultSortOrder: "asc",
  });
  const [name, setName] = React.useState("");
  const [logo, setLogo] = React.useState<LogoValue>({ mediaId: null, url: null });
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<TechnologyItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editSlug, setEditSlug] = React.useState("");
  const [editLogo, setEditLogo] = React.useState<LogoValue>({ mediaId: null, url: null });
  const [editSaving, setEditSaving] = React.useState(false);
  const [reorderingId, setReorderingId] = React.useState<string | null>(null);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await request("/categories/technologies", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), slug: slugify(name), logoId: logo.mediaId }),
      });
      setName("");
      setLogo({ mediaId: null, url: null });
      toast.success("Technology added");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    confirmDelete({
      title: "Delete this technology?",
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`/categories/technologies/${id}`, { method: "DELETE" });
        toast.success("Deleted");
        list.reload();
      },
    });
  }

  async function handleToggleEnabled(item: TechnologyItem, checked: boolean) {
    try {
      await request(`/categories/technologies/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled: checked }),
      });
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  function openEdit(item: TechnologyItem) {
    setEditing(item);
    setEditName(item.name);
    setEditSlug(item.slug);
    setEditLogo({ mediaId: item.logo?.id ?? null, url: item.logo?.url ?? null });
  }

  async function handleSaveEdit() {
    if (!editing || !editName.trim() || !editSlug.trim()) return;
    setEditSaving(true);
    try {
      await request(`/categories/technologies/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim(), logoId: editLogo.mediaId }),
      });
      toast.success("Technology updated");
      setEditing(null);
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setEditSaving(false);
    }
  }

  // Swaps `order` with the adjacent row within the currently loaded (order-
  // sorted) page — there's no drag-and-drop lib in the repo and none is
  // needed for a simple move-up/move-down reorder.
  async function handleMove(index: number, direction: -1 | 1) {
    const data = list.data;
    if (!data) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= data.length) return;
    const current = data[index]!;
    const target = data[targetIndex]!;
    setReorderingId(current.id);
    try {
      await Promise.all([
        request(`/categories/technologies/${current.id}`, {
          method: "PATCH",
          body: JSON.stringify({ order: target.order }),
        }),
        request(`/categories/technologies/${target.id}`, {
          method: "PATCH",
          body: JSON.stringify({ order: current.order }),
        }),
      ]);
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setReorderingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <DisplayStyleSelector />

      <div className="space-y-4 rounded-xl border border-neutral-200 p-4">
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Next.js"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <LogoField label="Logo (optional)" value={logo} onChange={setLogo} folder="agency-website/technologies" />
        <Button onClick={handleCreate} disabled={saving}>
          <Plus /> Add technology
        </Button>
      </div>

      <div>
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search technologies…"
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

      <div className="space-y-2">
        {list.loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState hasActiveFilters={list.hasActiveFilters} label="technologies" />
        ) : (
          list.data!.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <TechLogoThumb tech={item} />
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-heading">{item.name}</p>
                  <p className="truncate font-mono text-label text-neutral-400">/{item.slug}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0 || reorderingId !== null}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-3.5 text-neutral-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === list.data!.length - 1 || reorderingId !== null}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-3.5 text-neutral-500" />
                  </Button>
                </div>
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
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <ListSummary meta={list.meta} />
          <Pagination page={list.page} totalPages={list.meta?.totalPages ?? 1} onPageChange={list.setPage} />
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit technology</DialogTitle>
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
            <LogoField label="Logo" value={editLogo} onChange={setEditLogo} folder="agency-website/technologies" />
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
