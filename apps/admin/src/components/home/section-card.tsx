"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle, ArrowDown, ArrowUp, BarChart3, Briefcase, Building2, CalendarCheck, ChevronDown, ChevronRight, CircleDollarSign, Copy, FolderKanban, GripVertical,
  HelpCircle, LayoutPanelTop, ListOrdered, Mail, Megaphone, MoveHorizontal, Newspaper, Quote, Send, Trash2, Type, UserRound, type LucideIcon,
} from "lucide-react";
import { Badge, Switch } from "@agency/ui";
import { countNeedsContent, getSectionType } from "@agency/types";
import { FieldList, IdScope, type FieldErrors } from "@/components/cms/fields";

export const SECTION_ICONS: Record<string, LucideIcon> = {
  hero: LayoutPanelTop,
  marquee: MoveHorizontal,
  services_list: Briefcase,
  selected_work: FolderKanban,
  results: BarChart3,
  process: ListOrdered,
  pricing: CircleDollarSign,
  testimonials: Quote,
  faq: HelpCircle,
  inquiry_form: Send,
  cta_band: Megaphone,
  rich_text: Type,
  client_logos: Building2,
  founder_note: UserRound,
  latest_insights: Newspaper,
  booking_cta: CalendarCheck,
  newsletter: Mail,
};

export interface DraftSection {
  key: string; // client-only stable id (React key / dnd id)
  id?: string; // server id once saved
  type: string;
  visible: boolean;
  content: Record<string, unknown>;
}

let keyCounter = 0;
export const newKey = () => `k${Date.now().toString(36)}${keyCounter++}`;

function summaryOf(content: Record<string, unknown>) {
  const text = [content.heading, content.eyebrow, content.question].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  return text?.replace(/\*\*/g, "").slice(0, 70) ?? "";
}

export function SectionCard({
  section,
  index,
  count,
  open,
  errors,
  onToggleOpen,
  onChange,
  onVisible,
  onMove,
  onDuplicate,
  onDelete,
  canEdit,
}: {
  section: DraftSection;
  index: number;
  count: number;
  open: boolean;
  errors: FieldErrors;
  onToggleOpen: () => void;
  onChange: (content: Record<string, unknown>) => void;
  onVisible: (v: boolean) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  const def = getSectionType(section.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.key });
  const needs = def ? countNeedsContent(def.fields, section.content) : 0;
  const hasErrors = Object.keys(errors).length > 0;
  const panelId = `panel-${section.key}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      id={`section-${section.key}`}
      className={`scroll-mt-24 rounded-2xl border bg-background ${hasErrors ? "border-error-500" : "border-neutral-200"} ${isDragging ? "z-10 shadow-soft-lg" : ""} ${section.visible ? "" : "opacity-70"}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {canEdit && (
          <button type="button" className="cursor-grab rounded p-1 text-neutral-400 hover:text-heading" aria-label={`Drag to reorder ${def?.label ?? section.type}`} {...attributes} {...listeners}>
            <GripVertical className="size-5" />
          </button>
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggleOpen}
        >
          {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-body-sm font-bold text-heading">{index + 1}</span>
          {(() => {
            const Icon = SECTION_ICONS[section.type];
            return Icon ? <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden /> : null;
          })()}
          <span className="font-semibold text-heading">{def?.label ?? section.type}</span>
          <span className="hidden truncate text-body-sm text-neutral-500 sm:inline">{summaryOf(section.content)}</span>
        </button>
        {needs > 0 && (
          <Badge variant="warning" className="hidden gap-1 sm:inline-flex">
            <AlertTriangle className="size-3" /> {needs} needs content
          </Badge>
        )}
        {hasErrors && <Badge variant="error">Fix errors</Badge>}
        {!section.visible && <Badge variant="neutral">Hidden</Badge>}
        {canEdit && (
          <>
            <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading disabled:opacity-30" aria-label="Move section up" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUp className="size-4" />
            </button>
            <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading disabled:opacity-30" aria-label="Move section down" disabled={index === count - 1} onClick={() => onMove(1)}>
              <ArrowDown className="size-4" />
            </button>
            <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading" aria-label="Duplicate section" onClick={onDuplicate}>
              <Copy className="size-4" />
            </button>
            <button type="button" className="rounded p-1 text-neutral-400 hover:text-error-500" aria-label="Delete section" onClick={onDelete}>
              <Trash2 className="size-4" />
            </button>
            <Switch checked={section.visible} onCheckedChange={onVisible} aria-label={`Show ${def?.label ?? section.type} on the page`} />
          </>
        )}
      </div>
      {open && (
        <div id={panelId} className="grid gap-5 border-t border-neutral-200 p-4">
          {def ? (
            <>
              {def.description && <p className="text-body-sm text-neutral-500">{def.description}</p>}
              <IdScope.Provider value={section.key}>
                <FieldList fields={def.fields} content={section.content} onChange={onChange} basePath="c" errors={errors} />
              </IdScope.Provider>
            </>
          ) : (
            <p className="text-body-sm text-error-500">Unknown section type “{section.type}”. It cannot be edited here.</p>
          )}
        </div>
      )}
    </li>
  );
}

