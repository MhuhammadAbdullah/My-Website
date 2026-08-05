"use client";

import * as React from "react";
import { Button, Heading, Input, Label, Skeleton, Switch, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface InfluencerSettings {
  id: string;
  defaultCommissionPercent: string;
  allowPerInfluencerOverride: boolean;
  allowPerCampaignOverride: boolean;
  minimumBookingAmount: string | null;
  payoutMinimumAmount: string | null;
  payoutProcessingDays: number;
}

export default function InfluencerCommissionPage() {
  const { data: settings, loading } = useAsyncData<InfluencerSettings>(
    () => request<{ item: InfluencerSettings }>("/influencer-settings").then((r) => r.item),
    [],
  );
  const [form, setForm] = React.useState<InfluencerSettings | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await request("/influencer-settings", {
        method: "PATCH",
        body: JSON.stringify({
          defaultCommissionPercent: Number(form.defaultCommissionPercent),
          allowPerInfluencerOverride: form.allowPerInfluencerOverride,
          allowPerCampaignOverride: form.allowPerCampaignOverride,
          minimumBookingAmount: form.minimumBookingAmount === "" || form.minimumBookingAmount === null ? null : Number(form.minimumBookingAmount),
          payoutMinimumAmount: form.payoutMinimumAmount === "" || form.payoutMinimumAmount === null ? null : Number(form.payoutMinimumAmount),
          payoutProcessingDays: Number(form.payoutProcessingDays),
        }),
      });
      toast.success("Commission settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Heading level={2}>Commission & payout settings</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Controls how much the agency keeps from every booking, and the rules around minimum booking size and payout processing.
      </p>

      <div className="mt-6 max-w-xl">
        {loading || !form ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div>
              <Label>Default commission %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={form.defaultCommissionPercent}
                onChange={(e) => setForm({ ...form, defaultCommissionPercent: e.target.value })}
              />
              <p className="mt-1.5 text-body-sm text-neutral-500">Applied to every booking unless a per-influencer or per-campaign override is set.</p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <div>
                <p className="text-body-sm font-medium text-heading">Allow per-influencer override</p>
                <p className="text-label text-neutral-400">Lets staff set a custom commission % on an individual influencer's profile</p>
              </div>
              <Switch
                checked={form.allowPerInfluencerOverride}
                onCheckedChange={(v) => setForm({ ...form, allowPerInfluencerOverride: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <div>
                <p className="text-body-sm font-medium text-heading">Allow per-campaign override</p>
                <p className="text-label text-neutral-400">Lets staff set a custom commission % for a specific booking</p>
              </div>
              <Switch
                checked={form.allowPerCampaignOverride}
                onCheckedChange={(v) => setForm({ ...form, allowPerCampaignOverride: v })}
              />
            </div>

            <div>
              <Label>Minimum booking amount (optional)</Label>
              <Input
                type="number"
                min={0}
                value={form.minimumBookingAmount ?? ""}
                onChange={(e) => setForm({ ...form, minimumBookingAmount: e.target.value })}
                placeholder="No minimum"
              />
            </div>

            <div>
              <Label>Minimum payout amount (optional)</Label>
              <Input
                type="number"
                min={0}
                value={form.payoutMinimumAmount ?? ""}
                onChange={(e) => setForm({ ...form, payoutMinimumAmount: e.target.value })}
                placeholder="No minimum"
              />
              <p className="mt-1.5 text-body-sm text-neutral-500">Shown to influencers as guidance — not yet enforced automatically at payout creation.</p>
            </div>

            <div>
              <Label>Payout processing time (days)</Label>
              <Input
                type="number"
                min={0}
                value={form.payoutProcessingDays}
                onChange={(e) => setForm({ ...form, payoutProcessingDays: Number(e.target.value) })}
              />
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
