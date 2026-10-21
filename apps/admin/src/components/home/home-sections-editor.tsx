"use client";

import * as React from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ArrowDown, ArrowUp, Copy, ExternalLink, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Skeleton, Switch, cn, toast } from "@agency/ui";
import { OPTIONAL_SECTION_TYPES, SECTION_TYPES, buildContentSchema, countNeedsContent, defaultContent, getSectionType, type FieldDef } from "@agency/types";
import { request } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import { FieldList, IdScope, type FieldErrors } from "@/components/cms/fields";
import { useUnsavedChangesWarning } from "@/components/cms/use-unsaved-changes";
import { SECTION_ICONS, newKey, type DraftSection } from "./section-card";
import { HomeHeader, StatusChip } from "./home-header";

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

// Fields are printed under small group headings in the schema; in the editor each group becomes a pill tab.
interface FieldGroup {
  label: string;
  fields: FieldDef[];
}
const tabLabel = (g: string) => g.replace(/\s*\(.*?\)\s*/g, "").trim() || g;
function groupFields(fields: FieldDef[]): FieldGroup[] {
  const groups: (FieldGroup & { raw: string })[] = [];
  for (const f of fields) {
    const raw = f.group ?? "";
    const last = groups[groups.length - 1];
    if (!last || (raw && raw !== last.raw)) groups.push({ raw: raw || "Content", label: tabLabel(raw || "Content"), fields: [] });
    groups[groups.length - 1]!.fields.push({ ...f, group: undefined } as FieldDef);
  }
  return groups;
}

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
  const summary = summaryOf(section.content);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 rounded-[8px] border bg-neutral-50 pr-3 transition-colors",
        selected ? "border-accent-500" : hasErrors ? "border-error-500" : "border-neutral-200 hover:border-neutral-300",
        isDragging && "z-10 shadow-soft-lg",
        !section.visible && "opacity-60",
      )}
    >
      {canEdit && (
        <button type="button" className="cursor-grab rounded p-2 text-neutral-400 hover:text-heading" aria-label={`Drag ${def?.label ?? section.type} to reorder`} {...attributes} {...listeners}>
          <GripVertical className="size-3.5" />
        </button>
      )}
      <button type="button" onClick={onSelect} aria-current={selected} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[12px] font-extrabold", selected ? "bg-accent-500 text-on-accent" : "bg-neutral-100 text-heading")}>{index + 1}</span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold text-heading">{def?.label ?? section.type}</span>
          {summary && <span className="block truncate text-[12px] text-neutral-500">{summary}</span>}
        </span>
      </button>
      {needs > 0 && <span className="size-2 shrink-0 rounded-full bg-warning-500" aria-label={`${needs} placeholders to fill in`} />}
      {section.visible ? (
        <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-accent-500" aria-label="Shown on the site">
          <span className="size-1.5 rounded-full bg-accent-500" />
        </span>
      ) : (
        <EyeOff className="size-4 shrink-0 text-neutral-400" aria-label="Hidden on the site" />
      )}
    </li>
  );
}

export function HomeSectionsEditor({ tabs }: { tabs?: React.ReactNode }) {
  const { can } = usePermissions();
  const canEdit = can("home", "update");

  const [sections, setSections] = React.useState<DraftSection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [baseline, setBaseline] = React.useState("[]");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, FieldErrors>>({});
  const [busy, setBusy] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [groupTab, setGroupTab] = React.useState(0);

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
  const groups = React.useMemo(() => (currentDef ? groupFields(currentDef.fields) : []), [currentDef]);
  const tabbed = groups.length > 1 && groups.length <= 6;
  const activeGroup = groups[Math.min(groupTab, groups.length - 1)];
  React.useEffect(() => setGroupTab(0), [selected]);

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
      <button key={t.type} type="button" onClick={() => add(t.type)} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-left transition-colors hover:border-accent-500 bg-neutral-50">
        {Icon && <Icon className="mt-0.5 size-5 shrink-0 text-neutral-500" aria-hidden />}
        <span>
          <span className="block text-body-sm font-semibold text-heading">{t.label}</span>
          <span className="block text-label text-neutral-500">{t.description}</span>
        </span>
      </button>
    );
  };

  const currentErrors = current ? (errors[current.key] ?? {}) : {};
  const groupHasError = (g: FieldGroup) => g.fields.some((f) => Object.keys(currentErrors).some((k) => k === `c.${f.key}` || k.startsWith(`c.${f.key}.`)));
  const roundBtn = "flex size-9 items-center justify-center rounded-full border border-neutral-300 text-heading transition-colors hover:border-accent-500 disabled:opacity-30";

  return (
    <div className="pb-20">
      <HomeHeader
        title="Home page"
        description="Build your homepage from sections and set how it appears in search results."
        tabs={tabs}
        chips={
          <>
            {dirty ? <StatusChip tone="unsaved">Unsaved edits</StatusChip> : <StatusChip tone="saved">All changes saved</StatusChip>}
            {needs > 0 && (
              <StatusChip tone="todo">
                <AlertTriangle className="size-3" aria-hidden /> {needs} to fill in
              </StatusChip>
            )}
          </>
        }
        actions={
          <>
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-300 px-4 text-[13px] font-bold text-heading transition-colors hover:border-accent-500 hover:text-accent-500">
              View site <ExternalLink className="size-3.5" aria-hidden />
            </a>
            {canEdit && (
              <button type="button" onClick={save} disabled={busy || !dirty} className="inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-[13px] font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50">
                {busy ? "Saving…" : "Save & publish"}
              </button>
            )}
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[18.5rem_minmax(0,1fr)]">
        {/* LEFT: the page, top to bottom */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Page order</p>
            {canEdit && (
              <button type="button" onClick={() => setAdding(true)} className="inline-flex h-8 items-center gap-1 rounded-full border border-neutral-300 px-3 text-[12px] font-bold text-heading transition-colors hover:border-accent-500 hover:text-accent-500">
                <Plus className="size-3" aria-hidden /> Add
              </button>
            )}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2">
                {sections.map((s, i) => (
                  <ListItem key={s.key} section={s} index={i} selected={s.key === selected} needs={needsFor(s)} hasErrors={!!errors[s.key]} canEdit={canEdit} onSelect={() => setSelected(s.key)} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          {sections.length === 0 && <p className="rounded-[8px] border border-dashed border-neutral-300 p-6 text-center text-body-sm text-neutral-500">No sections yet. Click “Add”.</p>}
          <p className="mt-3 text-[12px] leading-relaxed text-neutral-400">Drag ⋮⋮ to reorder, or use the arrows in the editor. Eye = shown on site.</p>
        </aside>

        {/* MIDDLE: edit the selected section */}
        <section className="min-w-0 self-start rounded-[12px] border border-neutral-200 bg-neutral-50">
          {current && currentDef ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 p-5 sm:p-6">
                <div className="min-w-0 flex-1 basis-56">
                  <h2 className="font-heading font-extrabold tracking-tight text-heading" style={{ fontSize: "clamp(1.5rem, 1.1rem + 1vw, 2rem)", lineHeight: 1 }}>
                    {index + 1}. {currentDef.label}
                  </h2>
                  <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-neutral-500">{currentDef.description}</p>
                </div>
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="mr-1 flex items-center gap-2 text-[13px] text-heading">
                      <Switch checked={current.visible} onCheckedChange={(v) => update(current.key, { visible: v })} aria-label="Show this section on the site" />
                      {current.visible ? "Shown on site" : "Hidden"}
                    </label>
                    <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label="Move up" title="Move up" className={roundBtn}>
                      <ArrowUp className="size-3.5" aria-hidden />
                    </button>
                    <button type="button" onClick={() => move(1)} disabled={index === sections.length - 1} aria-label="Move down" title="Move down" className={roundBtn}>
                      <ArrowDown className="size-3.5" aria-hidden />
                    </button>
                    <button type="button" onClick={duplicate} aria-label="Duplicate section" title="Duplicate section" className={roundBtn}>
                      <Copy className="size-3.5" aria-hidden />
                    </button>
                    <button type="button" onClick={remove} aria-label="Delete section" title="Delete section" className="flex size-9 items-center justify-center rounded-full border border-error-500/50 text-error-500 transition-colors hover:bg-error-500/10">
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                )}
              </div>

              {tabbed && (
                <div role="tablist" aria-label="Section parts" className="flex flex-wrap gap-2 px-5 pt-5 sm:px-6">
                  {groups.map((g, i) => (
                    <button
                      key={g.label}
                      type="button"
                      role="tab"
                      aria-selected={i === groupTab}
                      onClick={() => setGroupTab(i)}
                      className={cn(
                        "relative rounded-full border px-4 py-2 text-[13px] font-bold transition-colors",
                        i === groupTab ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-300 text-heading hover:border-accent-500",
                      )}
                    >
                      {g.label}
                      {groupHasError(g) && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-error-500" aria-label="Has errors" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-5 p-5 sm:p-6">
                <IdScope.Provider value={current.key}>
                  <FieldList
                    fields={tabbed ? (activeGroup?.fields ?? []) : currentDef.fields}
                    content={current.content}
                    onChange={(content) => update(current.key, { content })}
                    basePath="c"
                    errors={currentErrors}
                  />
                </IdScope.Provider>
              </div>
            </>
          ) : (
            <p className="p-10 text-center text-body-sm text-neutral-500">Select a section on the left to edit it.</p>
          )}
        </section>
      </div>

      <details className="mt-8 rounded-[8px] border border-neutral-200 bg-neutral-50">
        <summary className="cursor-pointer select-none px-5 py-3 text-[13px] font-bold text-heading">Where do I edit what?</summary>
        <ul className="divide-y divide-neutral-200 border-t border-neutral-200 text-[13px]">
          {GUIDE.map((g) => (
            <li key={g.what} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
              <span className="text-heading">{g.what}</span>
              {g.href ? (
                <a href={g.href} className="font-bold text-accent-500 hover:underline">
                  {g.where}
                </a>
              ) : (
                <span className="text-neutral-500">{g.where}</span>
              )}
            </li>
          ))}
        </ul>
      </details>

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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-background/95 px-4 py-3 backdrop-blur md:left-64" role="status">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-body-sm text-heading">You have unsaved changes.</p>
            <button type="button" onClick={save} disabled={busy} className="inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-[13px] font-bold text-on-accent hover:opacity-90 disabled:opacity-50">
              {busy ? "Saving…" : "Save & publish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
