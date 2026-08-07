"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Heading,
  Input,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { usePermissions } from "@/lib/use-permissions";

interface DeliverableType {
  id: string;
  key: string;
  label: string;
  isEnabledGlobally: boolean;
  order: number;
}

// Fixed catalog seeded from the DeliverableType enum (brief §7) -- admin
// mostly enables/disables/relabels/reorders these rows rather than deleting
// them, since every influencer's InfluencerPricingItem references a row
// here by id. Delete is now allowed, but only for a type no influencer is
// currently using (guarded server-side) -- disable it instead if it's in use.
export default function InfluencerPricingPage() {
  const [items, setItems] = React.useState<DeliverableType[] | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const { can } = usePermissions();
  const canDelete = can("influencers", "delete");
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(() => {
    request<{ items: DeliverableType[] }>("/influencer-deliverable-types/admin")
      .then((r) => setItems(r.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load pricing catalog"));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function updateItem(id: string, data: Partial<Pick<DeliverableType, "label" | "isEnabledGlobally">>) {
    setSavingId(id);
    try {
      const res = await request<{ item: DeliverableType }>(`/influencer-deliverable-types/admin/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setItems((prev) => prev?.map((i) => (i.id === id ? res.item : i)) ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSavingId(null);
    }
  }

  function handleDelete(item: DeliverableType) {
    confirmDelete({
      title: `Delete "${item.label}"?`,
      description: `Permanently removes this deliverable type from the pricing catalog — it will no longer be selectable in any influencer's pricing form.\n\nBlocked if any influencer currently has a price set for it (disable it instead in that case, so their existing pricing keeps working).\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        await request(`/influencer-deliverable-types/admin/${item.id}`, { method: "DELETE" });
        toast.success("Deliverable type deleted");
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        load();
      },
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    confirmDelete({
      title: `Delete ${ids.length} deliverable type${ids.length === 1 ? "" : "s"}?`,
      description: `Permanently removes all ${ids.length} selected types from the pricing catalog.\n\nThe whole selection is blocked if even one selected type currently has influencer pricing set on it — disable those instead so existing pricing keeps working.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        const res = await request<{ count: number }>("/influencer-deliverable-types/admin/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        toast.success(`${res.count} deliverable type${res.count === 1 ? "" : "s"} deleted`);
        setSelected(new Set());
        load();
      },
    });
  }

  const rows = items ?? [];
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level={2}>Pricing catalog</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Control which deliverable types influencers can price and offer (Instagram Story, TikTok Video, UGC, etc). Disabling a
            type hides it from every influencer's pricing form and public profile, without deleting any pricing already set.
          </p>
        </div>
        {canDelete && selected.size > 0 && (
          <Button variant="outline" className="text-error-500" onClick={handleBulkDelete}>
            <Trash2 className="size-4" /> Delete {selected.size} selected
          </Button>
        )}
      </div>

      <div className="mt-6">
        {!items ? (
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
                      aria-label="Select all deliverable types"
                    />
                  </TableHead>
                )}
                <TableHead>Deliverable type</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Enabled</TableHead>
                {canDelete && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id}>
                  {canDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={(checked) => toggleOne(item.id, checked === true)}
                        aria-label={`Select ${item.label}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-label text-neutral-400">{item.key}</TableCell>
                  <TableCell>
                    <Input
                      defaultValue={item.label}
                      disabled={savingId === item.id}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value.trim() !== item.label) {
                          updateItem(item.id, { label: e.target.value.trim() });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={item.isEnabledGlobally}
                      disabled={savingId === item.id}
                      onCheckedChange={(checked) => updateItem(item.id, { isEnabledGlobally: checked })}
                      aria-label={item.isEnabledGlobally ? "Disable" : "Enable"}
                    />
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} aria-label={`Delete ${item.label}`}>
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canDelete ? 5 : 3} className="text-center text-neutral-400">
                    <Badge variant="neutral">No deliverable types yet</Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {ConfirmDialog}
    </div>
  );
}
