"use client";

import * as React from "react";
import { Suspense } from "react";
import { Plus, Copy, Trash2, Pencil, ImageOff, Monitor, Smartphone } from "lucide-react";
import {
  Badge,
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FieldError,
  Heading,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@agency/ui";
import {
  POPUP_TEMPLATE_TYPES,
  POPUP_TEMPLATE_FIELD_CONFIG,
  POPUP_DEVICE_TARGETS,
  POPUP_TARGETING_SCOPES,
  POPUP_CLOSE_BUTTON_STYLES,
  POPUP_IMAGE_POSITIONS,
  POPUP_TEXT_ALIGNMENTS,
  popupSchema,
  type PopupTemplateType,
  type PopupDeviceTarget,
  type PopupCountdownExpiryAction,
  type PopupTargetingScope,
  type PopupTriggerType,
  type PopupFrequencyMode,
  type PopupCloseButtonStyle,
  type PopupImagePosition,
  type PopupTextAlignment,
} from "@agency/types";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";
import { uploadImageToCloudinary, deleteMedia } from "@/lib/cloudinary-upload";
import { PopupPreview } from "@/components/popups/popup-preview";

interface PopupListItem {
  id: string;
  name: string;
  internalNotes: string | null;
  templateType: PopupTemplateType;
  isActive: boolean;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  heading: string | null;
  description: string | null;
  imageId: string | null;
  image: { id: string; url: string } | null;
  imageLinkUrl: string | null;
  ctaEnabled: boolean;
  ctaText: string | null;
  ctaUrl: string | null;
  ctaOpenNewTab: boolean;
  countdownEndAt: string | null;
  countdownTimezone: string | null;
  countdownExpiryAction: PopupCountdownExpiryAction;
  countdownExpiryMessage: string | null;
  design: Record<string, unknown>;
  targeting: { scope: PopupTargetingScope; pages: string[]; urls: string[] };
  trigger: { type: PopupTriggerType; delaySeconds?: number | null; scrollPercent?: number | null; pageViewCount?: number | null };
  frequency: { mode: PopupFrequencyMode; customHours?: number | null; maxImpressionsPerUser?: number | null };
  deviceTarget: PopupDeviceTarget;
  closeOnOverlayClick: boolean;
  impressionCount: number;
  clickCount: number;
  createdAt: string;
}

const TEMPLATE_LABELS = Object.fromEntries(POPUP_TEMPLATE_TYPES.map((t) => [t, POPUP_TEMPLATE_FIELD_CONFIG[t].label])) as Record<
  PopupTemplateType,
  string
>;

const TARGETING_SCOPE_LABELS: Record<PopupTargetingScope, string> = {
  ALL: "Entire website",
  HOME: "Homepage",
  SPECIFIC_PAGES: "Specific pages",
  SPECIFIC_URLS: "Specific URLs",
};

function targetSummary(targeting: PopupListItem["targeting"]) {
  if (targeting.scope === "SPECIFIC_PAGES") return `${targeting.pages.length} page${targeting.pages.length === 1 ? "" : "s"}`;
  if (targeting.scope === "SPECIFIC_URLS") return `${targeting.urls.length} URL${targeting.urls.length === 1 ? "" : "s"}`;
  return TARGETING_SCOPE_LABELS[targeting.scope];
}

function formatDate(value: string | null) {
  if (!value) return <span className="text-neutral-400">—</span>;
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ctr(item: PopupListItem) {
  if (item.impressionCount === 0) return "—";
  return `${((item.clickCount / item.impressionCount) * 100).toFixed(2)}%`;
}

const sortOptions = [
  { value: "priority", label: "Priority" },
  { value: "createdAt", label: "Date created" },
  { value: "name", label: "Name" },
  { value: "impressionCount", label: "Impressions" },
  { value: "clickCount", label: "Clicks" },
];

function PopupsPageInner() {
  const list = usePaginatedList<PopupListItem>({
    endpoint: "/popups/admin",
    defaultSortBy: "priority",
    defaultSortOrder: "desc",
    filterKeys: ["isActive", "templateType"],
  });
  const [dialogItem, setDialogItem] = React.useState<PopupListItem | null | "new">(null);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const { can } = usePermissions();
  const canDelete = can("popups", "delete");
  const canCreate = can("popups", "create");
  const rows = list.data ?? [];

  function handleDelete(item: PopupListItem) {
    confirmDelete({
      title: `Delete "${item.name}"?`,
      description: "Removes this popup immediately from every page it's currently targeting. This action cannot be undone.",
      onConfirm: async () => {
        await request(`/popups/${item.id}`, { method: "DELETE" });
        toast.success("Popup deleted");
        list.reload();
      },
    });
  }

  async function handleDuplicate(item: PopupListItem) {
    try {
      await request(`/popups/${item.id}/duplicate`, { method: "POST" });
      toast.success("Popup duplicated");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  async function handleToggle(item: PopupListItem, isActive: boolean) {
    try {
      await request(`/popups/${item.id}/toggle`, { method: "PATCH", body: JSON.stringify({ isActive }) });
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Popups</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Marketing popups shown to visitors on the public site — content, design, targeting, triggers, frequency, and analytics all
            configured per popup.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogItem("new")}>
            <Plus /> New popup
          </Button>
        )}
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search popups…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={sortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[
            {
              key: "isActive",
              label: "Status",
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ],
            },
            {
              key: "templateType",
              label: "Template",
              options: POPUP_TEMPLATE_TYPES.map((t) => ({ value: t, label: TEMPLATE_LABELS[t] })),
            },
          ]}
          onFilterChange={list.setFilter}
          limit={list.limit}
          onLimitChange={list.setLimit}
          hasActiveFilters={list.hasActiveFilters}
          onClearFilters={list.clearFilters}
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <Skeleton className="h-64 w-full" />
        ) : list.error ? (
          <p className="text-center text-body-sm text-error-500">{list.error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-heading">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{TEMPLATE_LABELS[p.templateType]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={p.isActive} onCheckedChange={(v) => handleToggle(p, v)} disabled={!can("popups", "update")} />
                  </TableCell>
                  <TableCell>{formatDate(p.startsAt)}</TableCell>
                  <TableCell>{formatDate(p.endsAt)}</TableCell>
                  <TableCell>{targetSummary(p.targeting)}</TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell>{p.impressionCount.toLocaleString()}</TableCell>
                  <TableCell>{p.clickCount.toLocaleString()}</TableCell>
                  <TableCell>{ctr(p)}</TableCell>
                  <TableCell>{formatDate(p.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDialogItem(p)} aria-label="Edit">
                        <Pencil className="size-4" />
                      </Button>
                      {canCreate && (
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(p)} aria-label="Duplicate">
                          <Copy className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="text-error-500" onClick={() => handleDelete(p)} aria-label="Delete">
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-neutral-400">
                    {list.hasActiveFilters ? <EmptyState hasActiveFilters label="popups" /> : <Badge variant="neutral">No popups yet</Badge>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!list.loading && !list.error && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <ListSummary meta={list.meta} />
          <Pagination page={list.page} totalPages={list.meta?.totalPages ?? 1} onPageChange={list.setPage} />
        </div>
      )}

      {dialogItem && (
        <PopupDialog
          item={dialogItem === "new" ? null : dialogItem}
          onClose={() => setDialogItem(null)}
          onSaved={() => {
            setDialogItem(null);
            list.reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / edit dialog
// ---------------------------------------------------------------------------

export interface PopupFormState {
  name: string;
  internalNotes: string;
  templateType: PopupTemplateType;
  isActive: boolean;
  priority: string;
  startsAt: string;
  endsAt: string;
  heading: string;
  description: string;
  imageId: string | null;
  imageUrl: string | null;
  imageLinkUrl: string;
  ctaEnabled: boolean;
  ctaText: string;
  ctaUrl: string;
  ctaOpenNewTab: boolean;
  countdownEndDate: string;
  countdownEndTime: string;
  countdownTimezone: string;
  countdownExpiryAction: PopupCountdownExpiryAction;
  countdownExpiryMessage: string;
  width: string;
  autoHeight: boolean;
  height: string;
  borderRadius: string;
  backgroundColor: string;
  textAlign: PopupTextAlignment;
  contentAlignment: PopupTextAlignment;
  buttonTextColor: string;
  buttonBackgroundColor: string;
  overlayColor: string;
  overlayOpacityPercent: string;
  closeButtonStyle: PopupCloseButtonStyle;
  imagePosition: PopupImagePosition;
  targetingScope: PopupTargetingScope;
  targetingPages: string;
  targetingUrls: string;
  triggerType: PopupTriggerType;
  delaySeconds: string;
  scrollPercent: string;
  pageViewCount: string;
  frequencyMode: PopupFrequencyMode;
  customHours: string;
  maxImpressionsPerUser: string;
  deviceTarget: PopupDeviceTarget;
  closeOnOverlayClick: boolean;
}

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}
function toTimeInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// `new Date("2026-08-31T23:59")` interprets that wall-clock time in the
// BROWSER's local zone, silently ignoring the admin-picked `timeZone` field
// entirely -- an admin in one zone setting a countdown for "America/New_York"
// would get an end time shifted by their own offset instead. This finds the
// UTC instant that reads as the given wall-clock time in `timeZone`, using
// each Date's own zoned-formatting round-trip rather than a fixed/hardcoded
// offset table (so it stays correct across DST transitions).
function zonedDateTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const asIfLocal = new Date(naiveUtc.toLocaleString("en-US", { timeZone }));
  const asIfUtc = new Date(naiveUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  const offset = asIfUtc.getTime() - asIfLocal.getTime();
  return new Date(naiveUtc.getTime() + offset);
}

function toFormState(item: PopupListItem | null): PopupFormState {
  const design = (item?.design ?? {}) as Record<string, unknown>;
  return {
    name: item?.name ?? "",
    internalNotes: item?.internalNotes ?? "",
    templateType: item?.templateType ?? "TEXT_ONLY",
    isActive: item?.isActive ?? true,
    priority: item ? String(item.priority) : "0",
    startsAt: toDateInput(item?.startsAt ?? null),
    endsAt: toDateInput(item?.endsAt ?? null),
    heading: item?.heading ?? "",
    description: item?.description ?? "",
    imageId: item?.imageId ?? null,
    imageUrl: item?.image?.url ?? null,
    imageLinkUrl: item?.imageLinkUrl ?? "",
    ctaEnabled: item?.ctaEnabled ?? false,
    ctaText: item?.ctaText ?? "",
    ctaUrl: item?.ctaUrl ?? "",
    ctaOpenNewTab: item?.ctaOpenNewTab ?? false,
    countdownEndDate: toDateInput(item?.countdownEndAt ?? null),
    countdownEndTime: toTimeInput(item?.countdownEndAt ?? null),
    countdownTimezone: item?.countdownTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    countdownExpiryAction: item?.countdownExpiryAction ?? "HIDE_POPUP",
    countdownExpiryMessage: item?.countdownExpiryMessage ?? "",
    width: design.width ? String(design.width) : "480",
    autoHeight: design.autoHeight !== undefined ? Boolean(design.autoHeight) : true,
    height: design.height ? String(design.height) : "",
    borderRadius: design.borderRadius !== undefined ? String(design.borderRadius) : "16",
    backgroundColor: (design.backgroundColor as string) ?? "#ffffff",
    textAlign: (design.textAlign as PopupTextAlignment) ?? "CENTER",
    contentAlignment: (design.contentAlignment as PopupTextAlignment) ?? "CENTER",
    buttonTextColor: (design.buttonTextColor as string) ?? "#ffffff",
    buttonBackgroundColor: (design.buttonBackgroundColor as string) ?? "#111111",
    overlayColor: (design.overlayColor as string) ?? "#000000",
    overlayOpacityPercent: design.overlayOpacity !== undefined ? String(Math.round(Number(design.overlayOpacity) * 100)) : "60",
    closeButtonStyle: (design.closeButtonStyle as PopupCloseButtonStyle) ?? "DEFAULT",
    imagePosition: (design.imagePosition as PopupImagePosition) ?? "TOP",
    targetingScope: item?.targeting.scope ?? "ALL",
    targetingPages: item?.targeting.pages.join("\n") ?? "",
    targetingUrls: item?.targeting.urls.join("\n") ?? "",
    triggerType: item?.trigger.type ?? "IMMEDIATE",
    delaySeconds: item?.trigger.delaySeconds ? String(item.trigger.delaySeconds) : "5",
    scrollPercent: item?.trigger.scrollPercent ? String(item.trigger.scrollPercent) : "50",
    pageViewCount: item?.trigger.pageViewCount ? String(item.trigger.pageViewCount) : "2",
    frequencyMode: item?.frequency.mode ?? "SESSION",
    customHours: item?.frequency.customHours ? String(item.frequency.customHours) : "24",
    maxImpressionsPerUser: item?.frequency.maxImpressionsPerUser ? String(item.frequency.maxImpressionsPerUser) : "",
    deviceTarget: item?.deviceTarget ?? "ALL",
    closeOnOverlayClick: item?.closeOnOverlayClick ?? true,
  };
}

const TEMPLATE_TABS = [
  { key: "content", label: "Content" },
  { key: "design", label: "Design" },
  { key: "targeting", label: "Targeting & Trigger" },
  { key: "schedule", label: "Schedule & Frequency" },
  { key: "preview", label: "Preview" },
] as const;

function PopupDialog({ item, onClose, onSaved }: { item: PopupListItem | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState<PopupFormState>(toFormState(item));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "mobile">("desktop");

  const fields = POPUP_TEMPLATE_FIELD_CONFIG[form.templateType];

  function set<K extends keyof PopupFormState>(key: K, value: PopupFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const media = await uploadImageToCloudinary(file, "popups");
      const previousId = form.imageId;
      set("imageId", media.id);
      set("imageUrl", media.url);
      if (previousId) void deleteMedia(previousId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleImageRemove() {
    if (form.imageId) void deleteMedia(form.imageId);
    set("imageId", null);
    set("imageUrl", null);
  }

  function buildPayload() {
    const countdownEndAt =
      form.countdownEndDate && form.countdownEndTime
        ? zonedDateTimeToUtc(form.countdownEndDate, form.countdownEndTime, form.countdownTimezone)
        : null;

    return {
      name: form.name,
      internalNotes: form.internalNotes,
      templateType: form.templateType,
      isActive: form.isActive,
      priority: form.priority,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      heading: form.heading,
      description: form.description,
      imageId: form.imageId,
      imageLinkUrl: form.imageLinkUrl,
      ctaEnabled: form.ctaEnabled,
      ctaText: form.ctaText,
      ctaUrl: form.ctaUrl,
      ctaOpenNewTab: form.ctaOpenNewTab,
      countdownEndAt,
      countdownTimezone: form.countdownTimezone,
      countdownExpiryAction: form.countdownExpiryAction,
      countdownExpiryMessage: form.countdownExpiryMessage,
      design: {
        width: form.width,
        autoHeight: form.autoHeight,
        height: form.autoHeight ? null : form.height,
        borderRadius: form.borderRadius,
        backgroundColor: form.backgroundColor,
        textAlign: form.textAlign,
        contentAlignment: form.contentAlignment,
        buttonTextColor: form.buttonTextColor,
        buttonBackgroundColor: form.buttonBackgroundColor,
        overlayColor: form.overlayColor,
        overlayOpacity: Number(form.overlayOpacityPercent) / 100,
        closeButtonStyle: form.closeButtonStyle,
        imagePosition: form.imagePosition,
      },
      targeting: {
        scope: form.targetingScope,
        pages: form.targetingPages.split("\n").map((v) => v.trim()).filter(Boolean),
        urls: form.targetingUrls.split("\n").map((v) => v.trim()).filter(Boolean),
      },
      trigger: {
        type: form.triggerType,
        delaySeconds: form.delaySeconds,
        scrollPercent: form.scrollPercent,
        pageViewCount: form.pageViewCount,
      },
      frequency: {
        mode: form.frequencyMode,
        customHours: form.customHours,
        maxImpressionsPerUser: form.maxImpressionsPerUser || null,
      },
      deviceTarget: form.deviceTarget,
      closeOnOverlayClick: form.closeOnOverlayClick,
    };
  }

  async function handleSave() {
    const parsed = popupSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      toast.error("Please fix the highlighted field(s).");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (item) {
        await request(`/popups/${item.id}`, { method: "PATCH", body: JSON.stringify(parsed.data) });
        toast.success("Popup updated");
      } else {
        await request("/popups", { method: "POST", body: JSON.stringify(parsed.data) });
        toast.success("Popup created");
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-3xl flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>{item ? "Edit popup" : "New popup"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 border-b border-neutral-200 pb-4 sm:grid-cols-2">
            <div>
              <Label>Popup name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Summer Sale Popup" aria-invalid={!!errors.name} />
              <FieldError>{errors.name}</FieldError>
            </div>
            <div>
              <Label>Priority</Label>
              <Input type="number" min={0} value={form.priority} onChange={(e) => set("priority", e.target.value)} />
              <p className="mt-1 text-label text-neutral-400">Higher priority wins if multiple popups are eligible at once.</p>
            </div>
            <div className="sm:col-span-2">
              <Label>Internal description (optional, not shown to visitors)</Label>
              <Textarea value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} id="popup-active" />
              <Label htmlFor="popup-active" className="font-normal">
                Active
              </Label>
            </div>
            <div className="sm:col-span-2">
              <Label>Template</Label>
              <Select value={form.templateType} onValueChange={(v) => set("templateType", v as PopupTemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POPUP_TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TEMPLATE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="content" className="mt-4">
            <TabsList>
              {TEMPLATE_TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {fields.image && (
                <div>
                  <Label>Image</Label>
                  {form.imageUrl ? (
                    <div className="mt-1.5 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL */}
                      <img src={form.imageUrl} alt="" className="h-20 w-32 rounded-lg border border-neutral-200 object-cover" />
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("popup-image-input")?.click()}>
                          Replace
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="text-error-500" onClick={handleImageRemove}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-300">
                      <ImageOff className="size-6" />
                    </div>
                  )}
                  <input
                    id="popup-image-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                  {!form.imageUrl && (
                    <Button type="button" variant="outline" size="sm" className="mt-2" disabled={uploading} onClick={() => document.getElementById("popup-image-input")?.click()}>
                      {uploading ? "Uploading…" : "Upload image"}
                    </Button>
                  )}
                  <FieldError>{errors.imageId}</FieldError>
                </div>
              )}

              {fields.image && !fields.heading && (
                <div>
                  <Label>Image link URL (optional)</Label>
                  <Input value={form.imageLinkUrl} onChange={(e) => set("imageLinkUrl", e.target.value)} placeholder="/services or https://…" />
                  <FieldError>{errors.imageLinkUrl}</FieldError>
                </div>
              )}

              {fields.heading && (
                <div>
                  <Label>Heading</Label>
                  <Input value={form.heading} onChange={(e) => set("heading", e.target.value)} aria-invalid={!!errors.heading} />
                  <FieldError>{errors.heading}</FieldError>
                </div>
              )}

              {fields.description && (
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
                </div>
              )}

              {fields.countdown && (
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <Label>Countdown</Label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="font-normal text-neutral-500">End date</Label>
                      <Input type="date" value={form.countdownEndDate} onChange={(e) => set("countdownEndDate", e.target.value)} aria-invalid={!!errors.countdownEndAt} />
                    </div>
                    <div>
                      <Label className="font-normal text-neutral-500">End time</Label>
                      <Input type="time" value={form.countdownEndTime} onChange={(e) => set("countdownEndTime", e.target.value)} />
                    </div>
                  </div>
                  <FieldError>{errors.countdownEndAt}</FieldError>
                  <div className="mt-3">
                    <Label className="font-normal text-neutral-500">Timezone</Label>
                    <Combobox
                      value={form.countdownTimezone}
                      onValueChange={(v) => set("countdownTimezone", v)}
                      placeholder="Select timezone"
                      searchPlaceholder="Search timezones…"
                      options={(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"]).map((tz) => ({
                        value: tz,
                        label: tz,
                      }))}
                    />
                  </div>
                  <div className="mt-3">
                    <Label className="font-normal text-neutral-500">When the countdown ends</Label>
                    <Select value={form.countdownExpiryAction} onValueChange={(v) => set("countdownExpiryAction", v as PopupCountdownExpiryAction)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIDE_POPUP">Hide popup automatically</SelectItem>
                        <SelectItem value="DISABLE_CTA">Disable the button</SelectItem>
                        <SelectItem value="SHOW_MESSAGE">Show a custom message</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.countdownExpiryAction === "SHOW_MESSAGE" && (
                    <div className="mt-3">
                      <Label className="font-normal text-neutral-500">Expiry message</Label>
                      <Input
                        value={form.countdownExpiryMessage}
                        onChange={(e) => set("countdownExpiryMessage", e.target.value)}
                        placeholder="e.g. This offer has ended"
                        aria-invalid={!!errors.countdownExpiryMessage}
                      />
                      <FieldError>{errors.countdownExpiryMessage}</FieldError>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.ctaEnabled} onCheckedChange={(v) => set("ctaEnabled", v)} id="popup-cta-enabled" />
                  <Label htmlFor="popup-cta-enabled" className="font-normal">
                    Call-to-action button
                  </Label>
                </div>
                {form.ctaEnabled && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="font-normal text-neutral-500">Button text</Label>
                      <Input value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} placeholder="Get Offer" aria-invalid={!!errors.ctaText} />
                      <FieldError>{errors.ctaText}</FieldError>
                    </div>
                    <div>
                      <Label className="font-normal text-neutral-500">Button URL</Label>
                      <Input value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/contact or https://…" aria-invalid={!!errors.ctaUrl} />
                      <FieldError>{errors.ctaUrl}</FieldError>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Switch checked={form.ctaOpenNewTab} onCheckedChange={(v) => set("ctaOpenNewTab", v)} id="popup-cta-newtab" />
                      <Label htmlFor="popup-cta-newtab" className="font-normal">
                        Open in a new tab
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="design" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="font-normal text-neutral-500">Width (px)</Label>
                  <Input type="number" min={240} max={1200} value={form.width} onChange={(e) => set("width", e.target.value)} />
                </div>
                <div>
                  <Label className="font-normal text-neutral-500">Height</Label>
                  <Select value={form.autoHeight ? "auto" : "fixed"} onValueChange={(v) => set("autoHeight", v === "auto")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="fixed">Fixed (px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!form.autoHeight && (
                  <div>
                    <Label className="font-normal text-neutral-500">Height (px)</Label>
                    <Input type="number" min={120} max={1000} value={form.height} onChange={(e) => set("height", e.target.value)} />
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="font-normal text-neutral-500">Border radius (px)</Label>
                  <Input type="number" min={0} max={48} value={form.borderRadius} onChange={(e) => set("borderRadius", e.target.value)} />
                </div>
                <div>
                  <Label className="font-normal text-neutral-500">Background color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.backgroundColor} onChange={(e) => set("backgroundColor", e.target.value)} className="size-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5" />
                    <Input value={form.backgroundColor} onChange={(e) => set("backgroundColor", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="font-normal text-neutral-500">Text alignment</Label>
                  <Select value={form.textAlign} onValueChange={(v) => set("textAlign", v as PopupTextAlignment)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POPUP_TEXT_ALIGNMENTS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a.charAt(0) + a.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-normal text-neutral-500">Content alignment</Label>
                  <Select value={form.contentAlignment} onValueChange={(v) => set("contentAlignment", v as PopupTextAlignment)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POPUP_TEXT_ALIGNMENTS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a.charAt(0) + a.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="font-normal text-neutral-500">Button text color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.buttonTextColor} onChange={(e) => set("buttonTextColor", e.target.value)} className="size-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5" />
                    <Input value={form.buttonTextColor} onChange={(e) => set("buttonTextColor", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="font-normal text-neutral-500">Button background color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.buttonBackgroundColor} onChange={(e) => set("buttonBackgroundColor", e.target.value)} className="size-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5" />
                    <Input value={form.buttonBackgroundColor} onChange={(e) => set("buttonBackgroundColor", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="font-normal text-neutral-500">Overlay color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.overlayColor} onChange={(e) => set("overlayColor", e.target.value)} className="size-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5" />
                    <Input value={form.overlayColor} onChange={(e) => set("overlayColor", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="font-normal text-neutral-500">Overlay opacity (%)</Label>
                  <Input type="number" min={0} max={100} value={form.overlayOpacityPercent} onChange={(e) => set("overlayOpacityPercent", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="font-normal text-neutral-500">Close button style</Label>
                  <Select value={form.closeButtonStyle} onValueChange={(v) => set("closeButtonStyle", v as PopupCloseButtonStyle)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POPUP_CLOSE_BUTTON_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fields.image && (
                  <div>
                    <Label className="font-normal text-neutral-500">Image position</Label>
                    <Select value={form.imagePosition} onValueChange={(v) => set("imagePosition", v as PopupImagePosition)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POPUP_IMAGE_POSITIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="targeting" className="space-y-4">
              <div>
                <Label>Show on</Label>
                <Select value={form.targetingScope} onValueChange={(v) => set("targetingScope", v as PopupTargetingScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POPUP_TARGETING_SCOPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {TARGETING_SCOPE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.targetingScope === "SPECIFIC_PAGES" && (
                <div>
                  <Label>Pages (one path per line, e.g. /services)</Label>
                  <Textarea value={form.targetingPages} onChange={(e) => set("targetingPages", e.target.value)} rows={4} />
                </div>
              )}
              {form.targetingScope === "SPECIFIC_URLS" && (
                <div>
                  <Label>URLs (one per line)</Label>
                  <Textarea value={form.targetingUrls} onChange={(e) => set("targetingUrls", e.target.value)} rows={4} />
                </div>
              )}

              <div>
                <Label>Device</Label>
                <Select value={form.deviceTarget} onValueChange={(v) => set("deviceTarget", v as PopupDeviceTarget)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POPUP_DEVICE_TARGETS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d.charAt(0) + d.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-4">
                <Label>Trigger</Label>
                <Select value={form.triggerType} onValueChange={(v) => set("triggerType", v as PopupTriggerType)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">Immediately</SelectItem>
                    <SelectItem value="DELAY">After X seconds</SelectItem>
                    <SelectItem value="SCROLL">On scroll %</SelectItem>
                    <SelectItem value="EXIT_INTENT">Exit intent</SelectItem>
                    <SelectItem value="PAGE_VIEWS">After viewing X pages</SelectItem>
                  </SelectContent>
                </Select>
                {form.triggerType === "DELAY" && (
                  <div className="mt-3">
                    <Label className="font-normal text-neutral-500">Delay (seconds)</Label>
                    <Input type="number" min={0} max={600} value={form.delaySeconds} onChange={(e) => set("delaySeconds", e.target.value)} aria-invalid={!!errors.delaySeconds} />
                    <FieldError>{errors.delaySeconds}</FieldError>
                  </div>
                )}
                {form.triggerType === "SCROLL" && (
                  <div className="mt-3">
                    <Label className="font-normal text-neutral-500">Scroll percentage</Label>
                    <Input type="number" min={1} max={100} value={form.scrollPercent} onChange={(e) => set("scrollPercent", e.target.value)} aria-invalid={!!errors.scrollPercent} />
                    <FieldError>{errors.scrollPercent}</FieldError>
                  </div>
                )}
                {form.triggerType === "PAGE_VIEWS" && (
                  <div className="mt-3">
                    <Label className="font-normal text-neutral-500">Number of pages</Label>
                    <Input type="number" min={1} max={50} value={form.pageViewCount} onChange={(e) => set("pageViewCount", e.target.value)} aria-invalid={!!errors.pageViewCount} />
                    <FieldError>{errors.pageViewCount}</FieldError>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.closeOnOverlayClick} onCheckedChange={(v) => set("closeOnOverlayClick", v)} id="popup-overlay-close" />
                <Label htmlFor="popup-overlay-close" className="font-normal">
                  Close when clicking outside the popup
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Start date (optional)</Label>
                  <Input type="date" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
                </div>
                <div>
                  <Label>End date (optional)</Label>
                  <Input type="date" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} aria-invalid={!!errors.endsAt} />
                  <FieldError>{errors.endsAt}</FieldError>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-4">
                <Label>Frequency</Label>
                <Select value={form.frequencyMode} onValueChange={(v) => set("frequencyMode", v as PopupFrequencyMode)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SESSION">Once per session</SelectItem>
                    <SelectItem value="DAY">Once per day</SelectItem>
                    <SelectItem value="WEEK">Once per week</SelectItem>
                    <SelectItem value="EVERY_VISIT">Every visit</SelectItem>
                    <SelectItem value="CUSTOM">Custom interval</SelectItem>
                  </SelectContent>
                </Select>
                {form.frequencyMode === "CUSTOM" && (
                  <div className="mt-3">
                    <Label className="font-normal text-neutral-500">Hours between shows</Label>
                    <Input type="number" min={1} max={8760} value={form.customHours} onChange={(e) => set("customHours", e.target.value)} aria-invalid={!!errors.customHours} />
                    <FieldError>{errors.customHours}</FieldError>
                  </div>
                )}
                <div className="mt-3">
                  <Label className="font-normal text-neutral-500">Maximum impressions per visitor (optional)</Label>
                  <Input type="number" min={1} max={1000} value={form.maxImpressionsPerUser} onChange={(e) => set("maxImpressionsPerUser", e.target.value)} placeholder="Unlimited" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview">
              <div className="flex items-center justify-center gap-2">
                <Button type="button" variant={previewDevice === "desktop" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewDevice("desktop")}>
                  <Monitor className="size-4" /> Desktop
                </Button>
                <Button type="button" variant={previewDevice === "mobile" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewDevice("mobile")}>
                  <Smartphone className="size-4" /> Mobile
                </Button>
              </div>
              <div className="mt-4 flex justify-center rounded-2xl bg-neutral-100 p-6">
                <PopupPreview form={form} device={previewDevice} />
              </div>
              <p className="mt-3 text-center text-label text-neutral-400">
                Approximate preview — countdown ticks live, exact spacing may vary slightly from the live site.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PopupsPage() {
  return (
    <Suspense fallback={null}>
      <PopupsPageInner />
    </Suspense>
  );
}
