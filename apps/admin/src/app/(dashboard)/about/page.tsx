"use client";

import * as React from "react";
import { Button, DynamicIcon, Heading, Input, Label, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, toast } from "@agency/ui";
import { request, createResourceClient } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { ResourceManager } from "@/components/resource-manager/resource-manager";
import { AboutSkillsManager } from "@/components/about/about-skills-manager";
import { AboutSeoForm } from "@/components/about/about-seo-form";

interface AboutContent {
  story: string;
  mission: string;
  vision: string;
  philosophy: string;
  heroHeading: string | null;
  missionLabel: string | null;
  visionLabel: string | null;
  philosophyLabel: string | null;
  valuesHeading: string | null;
  timelineHeading: string | null;
  teamHeading: string | null;
  skillsHeading: string | null;
  certificationsHeading: string | null;
  technologiesHeading: string | null;
}

// Shown next to every heading field's label -- the site renders `**word**`
// in italic serif and everything else in the regular sans font (see the
// Heading component in packages/ui). Admins can mark which words get that
// treatment; they can't change fonts directly.
const HEADING_HINT = "wrap words in **bold** to italicize them";

const EMPTY_ABOUT_FORM: AboutContent = {
  story: "",
  mission: "",
  vision: "",
  philosophy: "",
  heroHeading: null,
  missionLabel: null,
  visionLabel: null,
  philosophyLabel: null,
  valuesHeading: null,
  timelineHeading: null,
  teamHeading: null,
  skillsHeading: null,
  certificationsHeading: null,
  technologiesHeading: null,
};

function AboutStoryForm() {
  const { data: content, loading } = useAsyncData<AboutContent | null>(
    () => request<{ item: AboutContent | null }>("/pages/about").then((r) => r.item),
    [],
  );
  const [form, setForm] = React.useState<AboutContent>(EMPTY_ABOUT_FORM);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    // Pick only the editable fields -- the GET response also includes id/
    // seoId/updatedAt/seo (from `include: { seo: true }`), and naively
    // spreading the whole object back into the PUT body used to send Prisma
    // a raw `seo` object where it expects a nested-write shape, causing a
    // PrismaClientValidationError on every save.
    if (content) {
      setForm({ ...EMPTY_ABOUT_FORM, ...content });
    }
  }, [content]);

  function set<K extends keyof AboutContent>(key: K, value: AboutContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await request("/pages/about", { method: "PUT", body: JSON.stringify(form) });
      toast.success("About page updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full max-w-2xl" />;

  return (
    <div className="grid max-w-2xl gap-5">
      <Field label="Hero heading" hint={HEADING_HINT}>
        <Input value={form.heroHeading ?? ""} onChange={(e) => set("heroHeading", e.target.value || null)} placeholder="Our **story**, in plain terms." />
      </Field>
      <div>
        <Label>Story</Label>
        <Textarea rows={4} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Mission card label</Label>
          <Input value={form.missionLabel ?? ""} onChange={(e) => set("missionLabel", e.target.value || null)} placeholder="Mission" />
        </div>
        <div>
          <Label>Vision card label</Label>
          <Input value={form.visionLabel ?? ""} onChange={(e) => set("visionLabel", e.target.value || null)} placeholder="Vision" />
        </div>
        <div>
          <Label>Philosophy card label</Label>
          <Input value={form.philosophyLabel ?? ""} onChange={(e) => set("philosophyLabel", e.target.value || null)} placeholder="Philosophy" />
        </div>
      </div>
      <div>
        <Label>Mission</Label>
        <Textarea value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
      </div>
      <div>
        <Label>Vision</Label>
        <Textarea value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} />
      </div>
      <div>
        <Label>Development philosophy</Label>
        <Textarea value={form.philosophy} onChange={(e) => setForm({ ...form, philosophy: e.target.value })} />
      </div>
      <p className="-mt-2 text-body-sm text-neutral-400">
        Years in business and projects shipped are managed from Home Page → Statistics, so they stay in sync everywhere they're shown.
      </p>

      <div className="mt-2 grid gap-4 border-t border-neutral-200 pt-5 sm:grid-cols-2">
        <Field label="Core values heading" hint={HEADING_HINT}>
          <Input value={form.valuesHeading ?? ""} onChange={(e) => set("valuesHeading", e.target.value || null)} placeholder="Core **values**" />
        </Field>
        <Field label="Timeline heading" hint={HEADING_HINT}>
          <Input value={form.timelineHeading ?? ""} onChange={(e) => set("timelineHeading", e.target.value || null)} placeholder="Our **timeline**" />
        </Field>
        <Field label="Team heading" hint={HEADING_HINT}>
          <Input value={form.teamHeading ?? ""} onChange={(e) => set("teamHeading", e.target.value || null)} placeholder="Meet the **team**" />
        </Field>
        <Field label="Skills heading" hint={HEADING_HINT}>
          <Input value={form.skillsHeading ?? ""} onChange={(e) => set("skillsHeading", e.target.value || null)} placeholder="Skills" />
        </Field>
        <Field label="Certifications heading" hint={HEADING_HINT}>
          <Input value={form.certificationsHeading ?? ""} onChange={(e) => set("certificationsHeading", e.target.value || null)} placeholder="Certifications" />
        </Field>
        <Field label="Technologies heading" hint={HEADING_HINT}>
          <Input value={form.technologiesHeading ?? ""} onChange={(e) => set("technologiesHeading", e.target.value || null)} placeholder="The **stack** behind the work" />
        </Field>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {hint && <span className="text-body-sm text-neutral-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const coreValuesClient = createResourceClient<{ id: string; title: string; description: string; icon: string; order: number }>(
  "/core-values",
);
const timelineClient = createResourceClient<{ id: string; year: string; title: string; description: string; order: number }>(
  "/timeline-events",
);
const certificationsClient = createResourceClient<{ id: string; name: string; issuer: string; year: string; url: string | null; order: number }>(
  "/certifications",
);

export default function AboutContentPage() {
  return (
    <div>
      <Heading level={2}>About Page</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Story, values, timeline, and certifications.</p>

      <Tabs defaultValue="story" className="mt-6">
        <TabsList>
          <TabsTrigger value="story">Story</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="values">Core Values</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        <TabsContent value="story">
          <AboutStoryForm />
        </TabsContent>
        <TabsContent value="skills">
          <AboutSkillsManager />
        </TabsContent>
        <TabsContent value="values">
          <ResourceManager
            title="Core Values"
            resourceClient={coreValuesClient}
            columns={[
              { key: "title", label: "Title" },
              { key: "icon", label: "Icon", render: (item) => <DynamicIcon name={item.icon} size={18} /> },
            ]}
            fields={[
              { key: "title", label: "Title", type: "text", required: true },
              { key: "description", label: "Description", type: "textarea", required: true },
              { key: "icon", label: "Icon", type: "icon", required: true },
              { key: "order", label: "Sort order", type: "number" },
            ]}
            defaultValues={{ title: "", description: "", icon: "gem", order: 0 }}
          />
        </TabsContent>
        <TabsContent value="timeline">
          <ResourceManager
            title="Timeline"
            resourceClient={timelineClient}
            columns={[
              { key: "year", label: "Year" },
              { key: "title", label: "Title" },
            ]}
            fields={[
              { key: "year", label: "Year", type: "text", required: true },
              { key: "title", label: "Title", type: "text", required: true },
              { key: "description", label: "Description", type: "textarea", required: true },
              { key: "order", label: "Sort order", type: "number" },
            ]}
            defaultValues={{ year: "", title: "", description: "", order: 0 }}
          />
        </TabsContent>
        <TabsContent value="certifications">
          <ResourceManager
            title="Certifications"
            resourceClient={certificationsClient}
            columns={[
              { key: "name", label: "Name" },
              { key: "issuer", label: "Issuer" },
              { key: "year", label: "Year" },
            ]}
            fields={[
              { key: "name", label: "Name", type: "text", required: true },
              { key: "issuer", label: "Issuer", type: "text", required: true },
              { key: "year", label: "Year", type: "text", required: true },
              { key: "url", label: "URL", type: "url" },
              { key: "order", label: "Sort order", type: "number" },
            ]}
            defaultValues={{ name: "", issuer: "", year: "", url: "", order: 0 }}
          />
        </TabsContent>
        <TabsContent value="seo">
          <AboutSeoForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
