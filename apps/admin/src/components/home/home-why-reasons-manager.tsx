"use client";

import * as React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Heading, IconPicker, Input, Label, Skeleton, Switch, Textarea, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { WHY_REASON_ICON_OPTIONS } from "./icon-options";

interface WhyReason {
  id: string;
  icon: string;
  title: string;
  description: string;
  order: number;
  isEnabled: boolean;
}

const EMPTY_FORM = { icon: "Gem", title: "", description: "", isEnabled: true };
type ReasonForm = typeof EMPTY_FORM;

function SortableReasonRow({
  reason,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  reason: WhyReason;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: reason.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const Icon = WHY_REASON_ICON_OPTIONS[reason.icon];

  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-background p-4">
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-neutral-400 hover:text-heading" aria-label="Drag to reorder">
        <GripVertical className="size-4" />
      </button>

      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
        {Icon ? <Icon className="size-5" /> : null}
      </div>

      <div className="min-w-[10rem] flex-1 basis-40">
        <p className="font-medium text-heading">{reason.title}</p>
        <p className="text-body-sm text-neutral-500">{reason.description}</p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1">
        <Switch checked={reason.isEnabled} onCheckedChange={onToggleEnabled} aria-label="Enabled" />
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

export function HomeWhyReasonsManager() {
  const { data: reasons, loading, reload } = useAsyncData<WhyReason[]>(
    () => request<{ items: WhyReason[] }>("/home-why-reasons/admin?limit=100&sortBy=order&sortOrder=asc").then((r) => r.items),
    [],
  );
  const [items, setItems] = React.useState<WhyReason[]>([]);
  React.useEffect(() => setItems(reasons ?? []), [reasons]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WhyReason | null>(null);
  const [form, setForm] = React.useState<ReasonForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(reason: WhyReason) {
    setEditing(reason);
    setForm({ icon: reason.icon, title: reason.title, description: reason.description, isEnabled: reason.isEnabled });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { icon: form.icon, title: form.title, description: form.description, isEnabled: form.isEnabled };
      if (editing) {
        await request(`/home-why-reasons/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Reason updated");
      } else {
        await request("/home-why-reasons", { method: "POST", body: JSON.stringify({ ...payload, order: items.length }) });
        toast.success("Reason added");
      }
      setDialogOpen(false);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(reason: WhyReason) {
    confirmDelete({
      title: `Delete "${reason.title}"?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`/home-why-reasons/${reason.id}`, { method: "DELETE" });
        toast.success("Deleted");
        reload();
      },
    });
  }

  async function handleToggleEnabled(reason: WhyReason, enabled: boolean) {
    setItems((prev) => prev.map((r) => (r.id === reason.id ? { ...r, isEnabled: enabled } : r)));
    try {
      await request(`/home-why-reasons/${reason.id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: enabled }) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      reload();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((r) => r.id === active.id);
    const newIndex = items.findIndex((r) => r.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    try {
      await Promise.all(
        reordered.map((reason, index) =>
          reason.order === index ? null : request(`/home-why-reasons/${reason.id}`, { method: "PATCH", body: JSON.stringify({ order: index }) }),
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
          <Heading level={2}>Why Work With Us</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">The reasons grid shown on the home page. Drag to reorder.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add reason
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-body-sm text-neutral-400">
            No reasons yet — add one to show it on the home page.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {items.map((reason) => (
                <SortableReasonRow
                  key={reason.id}
                  reason={reason}
                  onEdit={() => openEdit(reason)}
                  onDelete={() => handleDelete(reason)}
                  onToggleEnabled={(enabled) => handleToggleEnabled(reason, enabled)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit reason" : "New reason"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Icon</Label>
              <IconPicker value={form.icon} onValueChange={(icon) => setForm({ ...form, icon })} options={WHY_REASON_ICON_OPTIONS} />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Craft over speed" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2.5">
              <Switch checked={form.isEnabled} onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked })} />
              <Label className="mb-0">Show on home page</Label>
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
