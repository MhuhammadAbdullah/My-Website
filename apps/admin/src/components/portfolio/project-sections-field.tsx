"use client";

import * as React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button, IconPicker, Input, Label, RichTextEditor, cn } from "@agency/ui";
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload";

export interface ProjectSectionForm {
  id: string;
  title: string;
  content: string;
  icon: string | null;
  order: number;
}

function makeSectionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `section-${Date.now()}-${Math.random()}`;
}

export function newProjectSection(): ProjectSectionForm {
  return { id: makeSectionId(), title: "", content: "", icon: null, order: 0 };
}

function SortableSectionCard({
  section,
  index,
  collapsed,
  onToggleCollapsed,
  onChange,
  onDuplicate,
  onDelete,
}: {
  section: ProjectSectionForm;
  index: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onChange: (patch: Partial<ProjectSectionForm>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleImageUpload(file: File) {
    const media = await uploadImageToCloudinary(file, "agency-website/projects/sections");
    return media.url;
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-neutral-200 bg-background">
      <div className="flex items-center gap-2.5 p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-neutral-400 hover:text-heading"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>

        <IconPicker value={section.icon} onValueChange={(icon) => onChange({ icon })} placeholder="Icon" className="w-40" />

        <Input
          value={section.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={`Section ${index + 1} title`}
          className="flex-1"
        />

        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplicate section">
            <Copy className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label="Delete section">
            <Trash2 className="size-4 text-error-500" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand" : "Collapse"}>
            <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-neutral-200 p-4">
          <Label>Content</Label>
          <RichTextEditor
            value={section.content}
            onChange={(content) => onChange({ content })}
            onImageUpload={handleImageUpload}
            placeholder="Write this section's content…"
          />
        </div>
      )}
    </div>
  );
}

export function ProjectSectionsField({
  sections,
  onChange,
}: {
  sections: ProjectSectionForm[];
  onChange: (sections: ProjectSectionForm[]) => void;
}) {
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function updateSection(id: string, patch: Partial<ProjectSectionForm>) {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSection() {
    onChange([...sections, newProjectSection()]);
  }

  function duplicateSection(index: number) {
    const source = sections[index]!;
    const copy: ProjectSectionForm = { ...source, id: makeSectionId(), title: `${source.title} (copy)` };
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    onChange(next);
  }

  function deleteSection(id: string) {
    onChange(sections.filter((s) => s.id !== id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    onChange(arrayMove(sections, oldIndex, newIndex));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="mb-0">Project sections</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addSection}>
          <Plus className="size-4" /> Add section
        </Button>
      </div>

      {sections.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-neutral-200 p-6 text-center text-body-sm text-neutral-400">
          No sections yet — add one to build this project's case study.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-2 space-y-3">
              {sections.map((section, index) => (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  index={index}
                  collapsed={collapsedIds.has(section.id)}
                  onToggleCollapsed={() => toggleCollapsed(section.id)}
                  onChange={(patch) => updateSection(section.id, patch)}
                  onDuplicate={() => duplicateSection(index)}
                  onDelete={() => deleteSection(section.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
