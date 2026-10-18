"use client";

import * as React from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ArrowDown, ArrowUp, Copy, ExternalLink, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Skeleton, Switch, toast } from "@agency/ui";
import { OPTIONAL_SECTION_TYPES, SECTION_TYPES, buildContentSchema, countNeedsContent, defaultContent, getSectionType } from "@agency/types";
import { request } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import { FieldList, IdScope, type FieldErrors } from "@/components/cms/fields";
import { useUnsavedChangesWarning } from "@/components/cms/use-unsaved-changes";
import { SECTION_ICONS, newKey, type DraftSection } from "./section-card";

interface Server {
  id: string;
  type: string;
  visible: boolean;
  content: Record<string, unknown>;
}

const toDrafts = (list: Server[]): DraftSection[] => list.map((s) => ({ key: s.id, id: s.id, type: s.type, visible: s.visible, content: s.content }));
const snap = (list: DraftSection[]) => JSON.stringify(list.map((s) => [s.id ?? s.key, s.type, s.visible, s.content]));
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const summaryOf = (content: Record<string, unknown>) => {
  const text = [content.heading, content.eyebrow, content.quote].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  return text?.replace(/\*\*/g, "").slice(0, 48) ?? "";
};

// Where each kind of thing is edited. Collapsed by default.
const GUIDE: { what: string; where: string; href?: string }[] = [
  { what: "Text, headings, buttons, images and cards of a section", where: "Pick that section in the list on the left" },
  { what: "Services list", where: "Content → Services", href: "/services" },
  { what: "Selected work (projects)", where: "Content → Portfolio", href: "/portfolio" },
  { what: "Testimonials", where: "Content → Testimonials", href: "/testimonials" },
  { what: "FAQs", where: "Content → FAQs", href: "/faqs" },
  { what: "Enquiries sent from the form", where: "Site → Messages", href: "/analytics" },
  { what: "Menu, header button, footer, accent colour", where: "Site → Site Settings", href: "/site-settings" },
  { what: "Brand name, logo, contact details, social links", where: "Site → Settings", href: "/settings" },
  { what: "Search title, description and share image", where: "The SEO tab on this page" },
];

function ListItem({
  section,
  index,
  selected,
  needs,
  hasErrors,
  canEdit,
  onSelect,
}: {
  section: DraftSection;
  index: number;
  selected: boolean;
  needs: number;
  hasErrors: boolean;
  canEdit: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.key });
  const def = getSectionType(section.type);
  const Icon = SECTION_ICONS[section.type];
  const summary = summaryOf(section.content);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 rounded-xl border bg-background pr-2 ${selected ? "border-heading ring-1 ring-heading" : hasErrors ? "border-error-500" : "border-neutral-200 hover:border-neutral-400"} ${isDragging ? "z-10 shadow-soft-lg" : ""} ${section.visible ? "" : "opacity-60"}`}
    >
      {canEdit && (
        <button type="button" className="cursor-grab rounded p-2 text-neutral-400 hover:text-heading" aria-label={`Drag ${def?.label ?? section.type} to reorder`} {...attributes} {...listeners}>
          <GripVertical className="size-4" />
        </button>
      )}
      <button type="button" onClick={onSelect} aria-current={selected} className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 text-left">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-label font-bold text-heading">{index + 1}</span>
        {Icon && <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />}
        <span className="min-w-0">
          <span className="block truncate text-body-sm font-semibold text-heading">{def?.label ?? section.type}</span>
          {summary && <span className="block truncate text-label text-neutral-500">{summary}</span>}
        </span>
      </button>
      {!section.visible && <EyeOff className="size-4 shrink-0 text-neutral-400" aria-label="Hidden on the site" />}
      {needs > 0 && <span className="size-2 shrink-0 rounded-full bg-warning-500" aria-label={`${needs} placeholders to fill in`} />}
    </li>
  );
}

export function HomeSectionsEditor() {
  const { can } = usePermissions();
  const canEdit = can("home", "update");

  const [sections, setSections] = React.useState<DraftSection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [baseline, setBaseline] = React.useState("[]");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, FieldErrors>>({});
  const [busy, setBusy] = React.useState(false);
  const [adding, setAdding] = React.useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const apply = React.useCallback((list: Server[]) => {
    const drafts = toDrafts(list);
    setSections(drafts);
    setBaseline(snap(drafts));
    setErrors({});
    return drafts;
  }, []);

  React.useEffect(() => {
    request<{ sections: Server[] }>("/home-layout/admin")
      .then((r) => setSelected(apply(r.sections)[0]?.key ?? null))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load the homepage sections"))
      .finally(() => setLoading(false));
  }, [apply]);

  const dirty = snap(sections) !== baseline;
  useUnsavedChangesWarning(dirty);

  const needsFor = (s: DraftSection) => countNeedsContent(getSectionType(s.type)?.fields ?? [], s.content);
  const needs = sections.reduce((n, s) => n + needsFor(s), 0);
  const index = sections.findIndex((s) => s.key === selected);
  const current = index >= 0 ? sections[index]! : null;
  const currentDef = current ? getSectionType(current.type) : undefined;

  async function save() {
    const next: Record<string, FieldErrors> = {};
    for (const s of sections) {
      const def = getSectionType(s.type);
      if (!def) continue;
      const parsed = buildContentSchema(def.fields).safeParse(s.content);
      if (!parsed.success) {
        const fe: FieldErrors = {};
        for (const issue of parsed.error.issues) fe[`c.${issue.path.join(".")}`] = issue.message;
        next[s.key] = fe;
      }
    }
    setErrors(next);
    const bad = Object.keys(next);
    if (bad.length) {
      setSelected(bad[0]!);
      toast.error(`Fix the highlighted field${bad.length > 1 ? "s" : ""} in ${bad.length} section${bad.length > 1 ? "s" : ""} (marked red in the list).`);
      return;
    }
    setBusy(true);
    try {
      const keepIndex = index;
      const r = await request<{ sections: Server[] }>("/home-layout", {
        method: "PUT",
        body: JSON.stringify({ sections: sections.map((s) => ({ id: s.id, type: s.type, visible: s.visible, content: s.content })) }),
      });
      const drafts = apply(r.sections);
      setSelected(drafts[Math.max(0, Math.min(keepIndex, drafts.length - 1))]?.key ?? null);
      toast.success("Saved — your homepage updates within about 30 seconds.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const update = (key: string, patch: Partial<DraftSection>) => setSections((l) => l.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  function add(type: string) {
    const def = getSectionType(type);
    if (!def) return;
    const key = newKey();
    setSections((l) => [...l, { key, type, visible: true, content: defaultContent(def.fields) }]);
    setSelected(key);
    setAdding(false);
    toast.success(`${def.label} added at the bottom — fill it in, then Save.`);
  }

  function duplicate() {
    if (!current) return;
    const key = newKey();
    setSections((l) => [...l.slice(0, index + 1), { key, type: current.type, visible: current.visible, content: structuredClone(current.content) }, ...l.slice(index + 1)]);
    setSelected(key);
  }

  function remove() {
    if (!current || !window.confirm(`Delete this ${currentDef?.label ?? "section"}? It is removed from the site once you save.`)) return;
    const next = sections.filter((s) => s.key !== current.key);
    setSections(next);
    setSelected(next[Math.min(index, next.length - 1)]?.key ?? null);
  }

  const move = (dir: -1 | 1) => setSections((l) => arrayMove(l, index, index + dir));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setSections((l) => arrayMove(l, l.findIndex((s) => s.key === e.active.id), l.findIndex((s) => s.key === e.over!.id)));
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  const core = SECTION_TYPES.filter((t) => !(OPTIONAL_SECTION_TYPES as readonly string[]).includes(t.type));
  const extra = SECTION_TYPES.filter((t) => (OPTIONAL_SECTION_TYPES as readonly string[]).includes(t.type));
  const card = (t: (typeof SECTION_TYPES)[number]) => {
    const Icon = SECTION_ICONS[t.type];
    return (
      <button key={t.type} type="button" onClick={() => add(t.type)} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-left transition-colors hover:border-heading">
        {Icon && <Icon className="mt-0.5 size-5 shrink-0 text-neutral-500" aria-hidden />}
        <span>
          <span className="block text-body-sm font-semibold text-heading">{t.label}</span>
          <span className="block text-label text-neutral-500">{t.description}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="pb-20">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? <Badge variant="warning">Unsaved edits</Badge> : <Badge variant="success">All changes saved</Badge>}
          {needs > 0 && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="size-3" /> {needs} placeholder{needs > 1 ? "s" : ""} to fill in
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={siteUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> View site
            </a>
          </Button>
          {canEdit && (
            <Button type="button" size="sm" onClick={save} disabled={busy || !dirty}>
              {busy ? "Saving…" : "Save & publish"}
            </Button>
          )}
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-neutral-200">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-body-sm font-semibold text-heading">Where do I edit what?</summary>
        <ul className="divide-y divide-neutral-200 border-t border-neutral-200 text-body-sm">
          {GUIDE.map((g) => (
            <li key={g.what} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span className="text-heading">{g.what}</span>
              {g.href ? (
                <a href={g.href} className="font-medium text-heading underline">
                  {g.where}
                </a>
              ) : (
                <span className="text-neutral-500">{g.where}</span>
              )}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-5 grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* LEFT: the page, top to bottom */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-body-sm font-semibold text-heading">Page order (top to bottom)</p>
            {canEdit && (
              <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
                <Plus /> Add
              </Button>
            )}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-1.5">
                {sections.map((s, i) => (
                  <ListItem key={s.key} section={s} index={i} selected={s.key === selected} needs={needsFor(s)} hasErrors={!!errors[s.key]} canEdit={canEdit} onSelect={() => setSelected(s.key)} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          {sections.length === 0 && <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-body-sm text-neutral-500">No sections yet. Click “Add”.</p>}
          <p className="mt-2 text-label text-neutral-400">Drag ⋮⋮ to reorder. Click a section to edit it.</p>
        </aside>

        {/* RIGHT: edit the selected section */}
        <section className="min-w-0 rounded-2xl border border-neutral-200">
          {current && currentDef ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 p-4">
                <div className="min-w-0">
                  <p className="font-heading text-h4 font-semibold text-heading">
                    {index + 1}. {currentDef.label}
                  </p>
                  <p className="mt-0.5 max-w-xl text-body-sm text-neutral-500">{currentDef.description}</p>
                </div>
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="mr-2 flex items-center gap-2 text-body-sm text-heading">
                      <Switch checked={current.visible} onCheckedChange={(v) => update(current.key, { visible: v })} aria-label="Show this section on the site" />
                      {current.visible ? "Shown on site" : "Hidden"}
                    </label>
                    <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => move(-1)} aria-label="Move up">
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={index === sections.length - 1} onClick={() => move(1)} aria-label="Move down">
                      <ArrowDown />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={duplicate} aria-label="Duplicate section">
                      <Copy />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={remove} aria-label="Delete section" className="text-error-500">
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid gap-5 p-4 sm:p-6">
                <IdScope.Provider value={current.key}>
                  <FieldList fields={currentDef.fields} content={current.content} onChange={(content) => update(current.key, { content })} basePath="c" errors={errors[current.key] ?? {}} />
                </IdScope.Provider>
              </div>
            </>
          ) : (
            <p className="p-10 text-center text-body-sm text-neutral-500">Select a section on the left to edit it.</p>
          )}
        </section>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a section</DialogTitle>
          </DialogHeader>
          <p className="text-label font-semibold uppercase tracking-wide text-neutral-500">Homepage sections</p>
          <div className="grid gap-2 sm:grid-cols-2">{core.map(card)}</div>
          <p className="mt-2 text-label font-semibold uppercase tracking-wide text-neutral-500">Extras</p>
          <div className="grid gap-2 sm:grid-cols-2">{extra.map(card)}</div>
        </DialogContent>
      </Dialog>

      {dirty && canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-background/95 px-4 py-3 backdrop-blur" role="status">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-body-sm text-heading">You have unsaved changes.</p>
            <Button type="button" size="sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save & publish"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
