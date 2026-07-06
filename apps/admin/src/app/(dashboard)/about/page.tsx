"use client";

import * as React from "react";
import { Button, Heading, Input, Label, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, toast } from "@agency/ui";
import { request, createResourceClient } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { ResourceManager } from "@/components/resource-manager/resource-manager";

interface AboutContent {
  story: string;
  mission: string;
  vision: string;
  philosophy: string;
  yearsExperience: number;
  projectsShipped: number;
}

function AboutStoryForm() {
  const { data: content, loading } = useAsyncData<AboutContent | null>(
    () => request<{ item: AboutContent | null }>("/pages/about").then((r) => r.item),
    [],
  );
  const [form, setForm] = React.useState<AboutContent>({
    story: "",
    mission: "",
    vision: "",
    philosophy: "",
    yearsExperience: 0,
    projectsShipped: 0,
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
        story: content.story,
        mission: content.mission,
        vision: content.vision,
        philosophy: content.philosophy,
        yearsExperience: content.yearsExperience,
        projectsShipped: content.projectsShipped,
      });
    }
  }, [content]);

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
      <div>
        <Label>Story</Label>
        <Textarea rows={4} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
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
      <div className="grid grid-cols-2 gap-5">
        <div>
          <Label>Years of experience</Label>
          <Input
            type="number"
            value={form.yearsExperience}
            onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Projects shipped</Label>
          <Input
            type="number"
            value={form.projectsShipped}
            onChange={(e) => setForm({ ...form, projectsShipped: Number(e.target.value) })}
          />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
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
          <TabsTrigger value="values">Core Values</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>
        <TabsContent value="story">
          <AboutStoryForm />
        </TabsContent>
        <TabsContent value="values">
          <ResourceManager
            title="Core Values"
            resourceClient={coreValuesClient}
            columns={[
              { key: "title", label: "Title" },
              { key: "icon", label: "Icon" },
            ]}
            fields={[
              { key: "title", label: "Title", type: "text", required: true },
              { key: "description", label: "Description", type: "textarea", required: true },
              { key: "icon", label: "Lucide icon name", type: "text", required: true },
              { key: "order", label: "Sort order", type: "number" },
            ]}
            defaultValues={{ title: "", description: "", icon: "Gem", order: 0 }}
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
      </Tabs>
    </div>
  );
}
