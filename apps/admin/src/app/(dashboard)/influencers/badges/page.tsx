"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
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
import { ColorDot, ColorSelect } from "@/components/color-select";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";

interface BadgeCatalogItem {
  id: string;
  key: string;
  label: string;
  description: string | null;
  iconKey: string | null;
  color: string | null;
  isAutomated: boolean;
  order: number;
}

interface BadgeAwardItem {
  id: string;
  status: "RECOMMENDED" | "APPROVED" | "REJECTED";
  source: "AUTOMATIC" | "MANUAL";
  createdAt: string;
  badge: BadgeCatalogItem;
  influencer: { id: string; name: string; profile: { username: string } | null };
}

interface InfluencerOption {
  id: string;
  name: string;
  profile: { username: string } | null;
}

const STATUSES = ["RECOMMENDED", "APPROVED", "REJECTED"] as const;

function statusVariant(status: string): "success" | "error" | "warning" | "neutral" {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "error";
  return "warning";
}

export default function InfluencerBadgesPage() {
  return (
    <div>
      <Heading level={2}>Badges</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Manage the badge catalog (types, colors) and review awards to individual influencers.
      </p>

      <Tabs defaultValue="queue" className="mt-6">
        <TabsList>
          <TabsTrigger value="queue">Review queue</TabsTrigger>
          <TabsTrigger value="catalog">Badge catalog</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">
          <ReviewQueue />
        </TabsContent>
        <TabsContent value="catalog">
          <BadgeCatalogManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewQueue() {
  const [status, setStatus] = React.useState<(typeof STATUSES)[number]>("RECOMMENDED");
  const [showAward, setShowAward] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const { data: items, loading, reload } = useAsyncData<BadgeAwardItem[]>(
    () => request<{ items: BadgeAwardItem[] }>(`/influencer-badges/admin/queue?status=${status}`).then((r) => r.items),
    [status],
  );

  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    setBusyId(id);
    try {
      await request(`/influencer-badges/admin/${id}`, { method: "PATCH", body: JSON.stringify({ status: decision }) });
      toast.success(decision === "APPROVED" ? "Badge approved" : "Recommendation rejected");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(id: string) {
    setBusyId(id);
    try {
      await request(`/influencer-badges/admin/${id}`, { method: "DELETE" });
      toast.success("Badge revoked");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <Button key={s} variant={status === s ? "primary" : "outline"} size="sm" onClick={() => setStatus(s)}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowAward(true)}>
          <Plus /> Manually award
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (items ?? []).length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">
            No {status.toLowerCase()} badges.
          </div>
        ) : (
          <div className="space-y-2">
            {(items ?? []).map((award) => (
              <div key={award.id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
                <div>
                  <p className="flex items-center gap-2 text-body-sm font-medium text-heading">
                    <ColorDot color={award.badge.color} />
                    {award.influencer.profile ? `@${award.influencer.profile.username}` : award.influencer.name} — {award.badge.label}
                  </p>
                  <p className="text-label text-neutral-400">
                    {award.source === "AUTOMATIC" ? "Automatic recommendation" : "Manually awarded"} ·{" "}
                    {new Date(award.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(award.status)}>{award.status}</Badge>
                  {award.status === "RECOMMENDED" && (
                    <>
                      <Button variant="outline" size="sm" disabled={busyId === award.id} onClick={() => review(award.id, "REJECTED")}>
                        Reject
                      </Button>
                      <Button size="sm" disabled={busyId === award.id} onClick={() => review(award.id, "APPROVED")}>
                        Approve
                      </Button>
                    </>
                  )}
                  {award.status === "APPROVED" && (
                    <Button variant="ghost" size="sm" className="text-error-500" disabled={busyId === award.id} onClick={() => revoke(award.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAward && (
        <ManualAwardDialog
          onClose={() => setShowAward(false)}
          onAwarded={() => {
            setShowAward(false);
            if (status === "APPROVED") reload();
          }}
        />
      )}
    </div>
  );
}

function ManualAwardDialog({ onClose, onAwarded }: { onClose: () => void; onAwarded: () => void }) {
  const [influencerId, setInfluencerId] = React.useState("");
  const [badgeId, setBadgeId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const { data: influencers } = useAsyncData<InfluencerOption[]>(
    () => request<{ items: InfluencerOption[] }>("/influencers/admin?limit=100&status=APPROVED").then((r) => r.items),
    [],
  );
  const { data: badges } = useAsyncData<BadgeCatalogItem[]>(
    () => request<{ items: BadgeCatalogItem[] }>("/influencer-badges/admin/catalog").then((r) => r.items),
    [],
  );

  async function handleAward() {
    if (!influencerId || !badgeId) {
      toast.error("Select an influencer and a badge");
      return;
    }
    setSaving(true);
    try {
      await request("/influencer-badges/admin", { method: "POST", body: JSON.stringify({ influencerId, badgeId }) });
      toast.success("Badge awarded");
      onAwarded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex w-full max-w-md flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>Manually award a badge</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div>
            <Combobox
              value={influencerId}
              onValueChange={setInfluencerId}
              placeholder="Select influencer"
              searchPlaceholder="Search influencers…"
              options={(influencers ?? []).map((i) => ({ value: i.id, label: i.profile ? `@${i.profile.username}` : i.name, secondary: i.name }))}
            />
          </div>
          <div>
            <Select value={badgeId} onValueChange={setBadgeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select badge" />
              </SelectTrigger>
              <SelectContent>
                {(badges ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="flex items-center gap-2">
                      <ColorDot color={b.color} />
                      {b.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAward} disabled={saving}>
            {saving ? "Awarding…" : "Award badge"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BadgeCatalogManager() {
  const [dialogItem, setDialogItem] = React.useState<BadgeCatalogItem | null | "new">(null);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const { can } = usePermissions();
  const canDelete = can("influencerBadges", "delete");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const { data: badges, loading, reload } = useAsyncData<BadgeCatalogItem[]>(
    () => request<{ items: BadgeCatalogItem[] }>("/influencer-badges/admin/catalog").then((r) => r.items),
    [],
  );
  const rows = badges ?? [];

  function handleDelete(item: BadgeCatalogItem) {
    confirmDelete({
      title: `Delete "${item.label}"?`,
      description: `Deletes this badge type from the catalog and immediately removes it from every influencer's public profile it's currently awarded on (both approved awards and pending recommendations are wiped).\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`/influencer-badges/admin/catalog/${item.id}`, { method: "DELETE" });
        toast.success("Badge deleted");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        reload();
      },
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    confirmDelete({
      title: `Delete ${ids.length} badge type${ids.length === 1 ? "" : "s"}?`,
      description: `Deletes all ${ids.length} selected badge types from the catalog and immediately removes them from every influencer's public profile they're currently awarded on (both approved awards and pending recommendations are wiped).\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        const res = await request<{ count: number }>("/influencer-badges/admin/catalog/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} deleted`);
        setSelected(new Set());
        reload();
      },
    });
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const columnCount = canDelete ? 6 : 5;

  return (
    <div className="mt-6">
      <div className="flex justify-end gap-2">
        {canDelete && selected.size > 0 && (
          <Button variant="outline" className="text-error-500" onClick={handleBulkDelete}>
            <Trash2 className="size-4" /> Delete {selected.size} selected
          </Button>
        )}
        <Button onClick={() => setDialogItem("new")}>
          <Plus /> New badge type
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {canDelete && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleAll(checked === true)}
                      aria-label="Select all badge types"
                    />
                  </TableHead>
                )}
                <TableHead>Color</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  {canDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(b.id)}
                        onCheckedChange={(checked) => toggleOne(b.id, checked === true)}
                        aria-label={`Select ${b.label}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <ColorDot color={b.color} />
                  </TableCell>
                  <TableCell className="font-medium text-heading">{b.label}</TableCell>
                  <TableCell className="text-neutral-400">{b.key}</TableCell>
                  <TableCell>
                    <Badge variant={b.isAutomated ? "accent" : "neutral"}>{b.isAutomated ? "Automated" : "Manual only"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDialogItem(b)}>
                        Edit
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="text-error-500" onClick={() => handleDelete(b)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-neutral-400">
                    <Badge variant="neutral">No badge types yet</Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {dialogItem && (
        <BadgeCatalogDialog
          item={dialogItem === "new" ? null : dialogItem}
          onClose={() => setDialogItem(null)}
          onSaved={() => {
            setDialogItem(null);
            reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

interface BadgeCatalogFormState {
  key: string;
  label: string;
  description: string;
  iconKey: string;
  color: string | null;
  isAutomated: boolean;
  order: string;
}

function toBadgeFormState(item: BadgeCatalogItem | null): BadgeCatalogFormState {
  return {
    key: item?.key ?? "",
    label: item?.label ?? "",
    description: item?.description ?? "",
    iconKey: item?.iconKey ?? "",
    color: item?.color ?? null,
    isAutomated: item?.isAutomated ?? true,
    order: item ? String(item.order) : "0",
  };
}

function BadgeCatalogDialog({
  item,
  onClose,
  onSaved,
}: {
  item: BadgeCatalogItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<BadgeCatalogFormState>(toBadgeFormState(item));
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof BadgeCatalogFormState>(key: K, value: BadgeCatalogFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.key.trim() || !/^[a-z0-9-]+$/.test(form.key.trim())) {
      toast.error("Key must be lowercase letters, numbers, and - only");
      return;
    }
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        key: form.key.trim(),
        label: form.label,
        description: form.description.trim() || undefined,
        iconKey: form.iconKey.trim() || undefined,
        color: form.color,
        isAutomated: form.isAutomated,
        order: form.order ? Number(form.order) : 0,
      };
      if (item) {
        await request(`/influencer-badges/admin/catalog/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("Badge updated");
      } else {
        await request("/influencer-badges/admin/catalog", { method: "POST", body: JSON.stringify(body) });
        toast.success("Badge created");
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
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>{item ? "Edit badge type" : "New badge type"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Top Performer" />
          </div>

          <div>
            <Label>Key {item && <span className="text-neutral-400">(can't be changed after creation)</span>}</Label>
            <Input
              value={form.key}
              onChange={(e) => set("key", e.target.value.toLowerCase())}
              placeholder="e.g. top-performer"
              disabled={!!item}
            />
          </div>

          <div>
            <Label>Badge color</Label>
            <ColorSelect value={form.color} onValueChange={(v) => set("color", v)} />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Icon key (optional)</Label>
              <Input value={form.iconKey} onChange={(e) => set("iconKey", e.target.value)} placeholder="e.g. Trophy" />
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" min={0} value={form.order} onChange={(e) => set("order", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={form.isAutomated} onCheckedChange={(c) => set("isAutomated", c === true)} id="badge-automated" />
            <Label htmlFor="badge-automated" className="font-normal">
              Eligible for automatic scoring recommendations
            </Label>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
