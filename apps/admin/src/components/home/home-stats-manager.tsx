"use client";

import * as React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Heading,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";

type HighlightKey = "YEARS_IN_BUSINESS" | "PROJECTS_SHIPPED";

interface HomeStat {
  id: string;
  number: string;
  suffix: string | null;
  title: string;
  description: string | null;
  order: number;
  isEnabled: boolean;
  highlightKey: HighlightKey | null;
}

const HIGHLIGHT_LABELS: Record<HighlightKey, string> = {
  YEARS_IN_BUSINESS: "Years in business (About preview)",
  PROJECTS_SHIPPED: "Projects shipped (About preview)",
};

const EMPTY_FORM = { title: "", number: "", suffix: "", description: "", isEnabled: true, highlightKey: "" as HighlightKey | "" };
type StatForm = typeof EMPTY_FORM;

function SortableStatRow({
  stat,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  stat: HomeStat;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stat.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-background p-4"
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-neutral-400 hover:text-heading" aria-label="Drag to reorder">
        <GripVertical className="size-4" />
      </button>

      <div className="w-24 shrink-0 text-center">
        <p className="text-h5 font-semibold text-heading">
          {stat.number}
          <span className="text-accent-500">{stat.suffix}</span>
        </p>
      </div>

      <div className="min-w-[10rem] flex-1 basis-40">
        <div className="flex items-center gap-2">
          <p className="font-medium text-heading">{stat.title}</p>
          {stat.highlightKey && (
            <Badge variant="accent" className="gap-1">
              <Link2 className="size-3" /> Synced to About preview
            </Badge>
          )}
        </div>
        {stat.description && <p className="text-body-sm text-neutral-500">{stat.description}</p>}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1">
        <Switch checked={stat.isEnabled} onCheckedChange={onToggleEnabled} aria-label="Enabled" />
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
          <Trash2 className="size-4 text-error-500" />
        </Button>
      </div>
    </div>
  );
}

export function HomeStatsManager() {
  const { data: stats, loading, reload } = useAsyncData<HomeStat[]>(
    () => request<{ items: HomeStat[] }>("/home-stats/admin?limit=100&sortBy=order&sortOrder=asc").then((r) => r.items),
    [],
  );
  const [items, setItems] = React.useState<HomeStat[]>([]);
  React.useEffect(() => setItems(stats ?? []), [stats]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<HomeStat | null>(null);
  const [form, setForm] = React.useState<StatForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(stat: HomeStat) {
    setEditing(stat);
    setForm({
      title: stat.title,
      number: stat.number,
      suffix: stat.suffix ?? "",
      description: stat.description ?? "",
      isEnabled: stat.isEnabled,
      highlightKey: stat.highlightKey ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.number.trim()) {
      toast.error("Title and number are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        number: form.number,
        suffix: form.suffix || null,
        description: form.description || null,
        isEnabled: form.isEnabled,
        highlightKey: form.highlightKey || null,
      };
      if (editing) {
        await request(`/home-stats/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Statistic updated");
      } else {
        await request("/home-stats", {
          method: "POST",
          body: JSON.stringify({ ...payload, order: items.length }),
        });
        toast.success("Statistic added");
      }
      setDialogOpen(false);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(stat: HomeStat) {
    confirmDelete({
      title: `Delete "${stat.title}"?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`/home-stats/${stat.id}`, { method: "DELETE" });
        toast.success("Deleted");
        reload();
      },
    });
  }

  async function handleToggleEnabled(stat: HomeStat, enabled: boolean) {
    setItems((prev) => prev.map((s) => (s.id === stat.id ? { ...s, isEnabled: enabled } : s)));
    try {
      await request(`/home-stats/${stat.id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: enabled }) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      reload();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    try {
      await Promise.all(
        reordered.map((stat, index) =>
          stat.order === index ? null : request(`/home-stats/${stat.id}`, { method: "PATCH", body: JSON.stringify({ order: index }) }),
        ),
      );
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the new order");
      reload();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Statistics</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">The numbers shown below the hero. Drag to reorder.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add statistic
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-body-sm text-neutral-400">
            No statistics yet — add one to show it on the home page.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {items.map((stat) => (
                <SortableStatRow
                  key={stat.id}
                  stat={stat}
                  onEdit={() => openEdit(stat)}
                  onDelete={() => handleDelete(stat)}
                  onToggleEnabled={(enabled) => handleToggleEnabled(stat, enabled)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit statistic" : "New statistic"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Projects shipped" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Number</Label>
                <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="10" />
              </div>
              <div>
                <Label>Suffix (optional)</Label>
                <Input value={form.suffix} onChange={(e) => setForm({ ...form, suffix: e.target.value })} placeholder="+, %, K, M…" />
              </div>
            </div>
            <div>
              <Label>Short description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2.5">
              <Switch checked={form.isEnabled} onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked })} />
              <Label className="mb-0">Show on home page</Label>
            </div>
            <div>
              <Label>Link to About preview (optional)</Label>
              <Select
                value={form.highlightKey || "__none__"}
                onValueChange={(v) => setForm({ ...form, highlightKey: v === "__none__" ? "" : (v as HighlightKey) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not linked</SelectItem>
                  {(Object.keys(HIGHLIGHT_LABELS) as HighlightKey[]).map((key) => {
                    const takenByAnother = items.some((s) => s.highlightKey === key && s.id !== editing?.id);
                    return (
                      <SelectItem key={key} value={key} disabled={takenByAnother}>
                        {HIGHLIGHT_LABELS[key]}
                        {takenByAnother ? " — already linked" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-body-sm text-neutral-400">
                Linking a stat here also drives the matching figure on the "Design and engineering" section of the home page — no
                separate entry needed.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
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
