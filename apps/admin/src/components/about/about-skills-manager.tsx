"use client";

import * as React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Heading, Input, Label, Progress, Skeleton, Switch, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";

interface Skill {
  id: string;
  name: string;
  proficiency: number;
  order: number;
  isEnabled: boolean;
}

const EMPTY_FORM = { name: "", proficiency: "80", isEnabled: true };
type SkillForm = typeof EMPTY_FORM;

function SortableSkillRow({
  skill,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  skill: Skill;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: skill.id });
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

      <div className="min-w-[12rem] flex-1 basis-48">
        <div className="mb-1.5 flex justify-between text-body-sm">
          <span className="font-medium text-heading">{skill.name}</span>
          <span className="text-neutral-400">{skill.proficiency}%</span>
        </div>
        <Progress value={skill.proficiency} label={skill.name} />
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1">
        <Switch checked={skill.isEnabled} onCheckedChange={onToggleEnabled} aria-label="Enabled" />
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

export function AboutSkillsManager() {
  const { data: skills, loading, reload } = useAsyncData<Skill[]>(
    () => request<{ items: Skill[] }>("/skills/admin?limit=100&sortBy=order&sortOrder=asc").then((r) => r.items),
    [],
  );
  const [items, setItems] = React.useState<Skill[]>([]);
  React.useEffect(() => setItems(skills ?? []), [skills]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Skill | null>(null);
  const [form, setForm] = React.useState<SkillForm>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(skill: Skill) {
    setEditing(skill);
    setForm({ name: skill.name, proficiency: String(skill.proficiency), isEnabled: skill.isEnabled });
    setDialogOpen(true);
  }

  async function handleSave() {
    const proficiency = Number(form.proficiency);
    if (!form.name.trim()) {
      toast.error("Skill name is required");
      return;
    }
    if (!Number.isFinite(proficiency) || proficiency < 0 || proficiency > 100) {
      toast.error("Progress must be between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name, proficiency, isEnabled: form.isEnabled };
      if (editing) {
        await request(`/skills/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Skill updated");
      } else {
        await request("/skills", { method: "POST", body: JSON.stringify({ ...payload, order: items.length }) });
        toast.success("Skill added");
      }
      setDialogOpen(false);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(skill: Skill) {
    confirmDelete({
      title: `Delete "${skill.name}"?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`/skills/${skill.id}`, { method: "DELETE" });
        toast.success("Deleted");
        reload();
      },
    });
  }

  async function handleToggleEnabled(skill: Skill, enabled: boolean) {
    setItems((prev) => prev.map((s) => (s.id === skill.id ? { ...s, isEnabled: enabled } : s)));
    try {
      await request(`/skills/${skill.id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: enabled }) });
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
        reordered.map((skill, index) =>
          skill.order === index ? null : request(`/skills/${skill.id}`, { method: "PATCH", body: JSON.stringify({ order: index }) }),
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
          <Heading level={2}>Skills</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            The progress bars shown on the About page. Also assignable to individual team members. Drag to reorder.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add skill
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-body-sm text-neutral-400">
            No skills yet — add one to show it on the About page.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {items.map((skill) => (
                <SortableSkillRow
                  key={skill.id}
                  skill={skill}
                  onEdit={() => openEdit(skill)}
                  onDelete={() => handleDelete(skill)}
                  onToggleEnabled={(enabled) => handleToggleEnabled(skill, enabled)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit skill" : "New skill"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Skill name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="System Design" />
            </div>
            <div>
              <Label>Progress (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.proficiency}
                onChange={(e) => setForm({ ...form, proficiency: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2.5">
              <Switch checked={form.isEnabled} onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked })} />
              <Label className="mb-0">Show on About page</Label>
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
