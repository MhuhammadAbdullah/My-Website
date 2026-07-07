"use client";

import * as React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Heading, Input, Label, Skeleton, Switch, Textarea, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  order: number;
  isEnabled: boolean;
}

const EMPTY_FORM = { title: "", description: "", isEnabled: true };
type StepForm = typeof EMPTY_FORM;

function SortableStepRow({
  step,
  index,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  step: ProcessStep;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-background p-4">
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-neutral-400 hover:text-heading" aria-label="Drag to reorder">
        <GripVertical className="size-4" />
      </button>

      <p className="w-8 shrink-0 font-mono text-body-sm text-accent-500">0{index + 1}</p>

      <div className="min-w-[10rem] flex-1 basis-40">
        <p className="font-medium text-heading">{step.title}</p>
        <p className="text-body-sm text-neutral-500">{step.description}</p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1">
        <Switch checked={step.isEnabled} onCheckedChange={onToggleEnabled} aria-label="Enabled" />
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

export function HomeProcessManager() {
  const { data: steps, loading, reload } = useAsyncData<ProcessStep[]>(
    () => request<{ items: ProcessStep[] }>("/home-process-steps/admin?limit=100&sortBy=order&sortOrder=asc").then((r) => r.items),
    [],
  );
  const [items, setItems] = React.useState<ProcessStep[]>([]);
  React.useEffect(() => setItems(steps ?? []), [steps]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProcessStep | null>(null);
  const [form, setForm] = React.useState<StepForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(step: ProcessStep) {
    setEditing(step);
    setForm({ title: step.title, description: step.description, isEnabled: step.isEnabled });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { title: form.title, description: form.description, isEnabled: form.isEnabled };
      if (editing) {
        await request(`/home-process-steps/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Step updated");
      } else {
        await request("/home-process-steps", { method: "POST", body: JSON.stringify({ ...payload, order: items.length }) });
        toast.success("Step added");
      }
      setDialogOpen(false);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(step: ProcessStep) {
    confirmDelete({
      title: `Delete "${step.title}"?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`/home-process-steps/${step.id}`, { method: "DELETE" });
        toast.success("Deleted");
        reload();
      },
    });
  }

  async function handleToggleEnabled(step: ProcessStep, enabled: boolean) {
    setItems((prev) => prev.map((s) => (s.id === step.id ? { ...s, isEnabled: enabled } : s)));
    try {
      await request(`/home-process-steps/${step.id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: enabled }) });
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
        reordered.map((step, index) =>
          step.order === index ? null : request(`/home-process-steps/${step.id}`, { method: "PATCH", body: JSON.stringify({ order: index }) }),
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
          <Heading level={2}>How We Work</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">The process steps shown on the home page. Drag to reorder.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add step
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-body-sm text-neutral-400">
            No steps yet — add one to show it on the home page.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {items.map((step, index) => (
                <SortableStepRow
                  key={step.id}
                  step={step}
                  index={index}
                  onEdit={() => openEdit(step)}
                  onDelete={() => handleDelete(step)}
                  onToggleEnabled={(enabled) => handleToggleEnabled(step, enabled)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit step" : "New step"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Discovery" />
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
