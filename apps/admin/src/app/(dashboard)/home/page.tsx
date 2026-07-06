"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Heading, Input, Label, Skeleton, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface Stat {
  label: string;
  value: string;
  suffix: string;
}

interface HomeContent {
  heroHeadline: string;
  heroSubheadline: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  stats: Stat[];
}

export default function HomeContentPage() {
  const { data: content, loading } = useAsyncData<HomeContent | null>(
    () => request<{ item: HomeContent | null }>("/pages/home").then((r) => r.item),
    [],
  );
  const [form, setForm] = React.useState<HomeContent>({
    heroHeadline: "",
    heroSubheadline: "",
    heroCtaLabel: "",
    heroCtaHref: "",
    stats: [],
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    // Pick only the editable fields -- the GET response also includes id/
    // seoId/updatedAt/seo (from `include: { seo: true }`), and naively
    // spreading the whole object back into the PUT body used to send Prisma
    // a raw `seo` object where it expects a nested-write shape, causing a
    // PrismaClientValidationError on every save.
    if (content) {
      setForm({
        heroHeadline: content.heroHeadline,
        heroSubheadline: content.heroSubheadline,
        heroCtaLabel: content.heroCtaLabel,
        heroCtaHref: content.heroCtaHref,
        stats: content.stats,
      });
    }
  }, [content]);

  async function handleSave() {
    setSaving(true);
    try {
      await request("/pages/home", { method: "PUT", body: JSON.stringify(form) });
      toast.success("Home page updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function updateStat(index: number, key: keyof Stat, value: string) {
    const stats = [...form.stats];
    stats[index] = { ...stats[index]!, [key]: value };
    setForm({ ...form, stats });
  }

  if (loading) return <Skeleton className="h-96 w-full max-w-2xl" />;

  return (
    <div>
      <Heading level={2}>Home Page</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Hero copy and stats shown at the top of the home page.</p>

      <div className="mt-8 grid max-w-2xl gap-5">
        <div>
          <Label>Hero headline</Label>
          <Input value={form.heroHeadline} onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })} />
        </div>
        <div>
          <Label>Hero subheadline</Label>
          <Input value={form.heroSubheadline} onChange={(e) => setForm({ ...form, heroSubheadline: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label>CTA label</Label>
            <Input value={form.heroCtaLabel} onChange={(e) => setForm({ ...form, heroCtaLabel: e.target.value })} />
          </div>
          <div>
            <Label>CTA link</Label>
            <Input value={form.heroCtaHref} onChange={(e) => setForm({ ...form, heroCtaHref: e.target.value })} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="mb-0">Stats</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForm({ ...form, stats: [...form.stats, { label: "", value: "", suffix: "" }] })}
            >
              <Plus className="size-4" /> Add stat
            </Button>
          </div>
          <div className="mt-2 space-y-3">
            {form.stats.map((stat, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-2">
                <Input placeholder="Label" value={stat.label} onChange={(e) => updateStat(i, "label", e.target.value)} />
                <Input placeholder="Value" value={stat.value} onChange={(e) => updateStat(i, "value", e.target.value)} />
                <Input placeholder="Suffix" value={stat.suffix} onChange={(e) => updateStat(i, "suffix", e.target.value)} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setForm({ ...form, stats: form.stats.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 className="size-4 text-error-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-2 w-fit">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
