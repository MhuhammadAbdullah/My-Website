"use client";

import * as React from "react";
import { Heading, Input, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@agency/ui";
import { request } from "@/lib/api";

interface DeliverableType {
  id: string;
  key: string;
  label: string;
  isEnabledGlobally: boolean;
  order: number;
}

// Fixed catalog seeded from the DeliverableType enum (brief §7) -- admin only
// ever enables/disables/relabels/reorders these rows, never creates or
// deletes one, since every influencer's InfluencerPricingItem references a
// row here by id.
export default function InfluencerPricingPage() {
  const [items, setItems] = React.useState<DeliverableType[] | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

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

  return (
    <div>
      <Heading level={2}>Pricing catalog</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Control which deliverable types influencers can price and offer (Instagram Story, TikTok Video, UGC, etc). Disabling a
        type hides it from every influencer's pricing form and public profile, without deleting any pricing already set.
      </p>

      <div className="mt-6">
        {!items ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deliverable type</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
