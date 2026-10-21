"use client";

import * as React from "react";
import { FieldHint } from "@/components/field-hint";
import { Checkbox, DynamicIcon, Heading, Input, Label, Skeleton, Tabs, TabsContent, Textarea, cn, toast } from "@agency/ui";
import { HomeHeader, PageTabs, StatusChip } from "@/components/home/home-header";
import { request, createResourceClient } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { ResourceManager } from "@/components/resource-manager/resource-manager";
import { AboutSeoForm } from "@/components/about/about-seo-form";
import { AboutPageSettingsForm } from "@/components/about-page-settings-form";

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
  certificationsHeading: string | null;
  technologiesHeading: string | null;
  certificationsEnabled: boolean;
}

// Shown next to every heading field's label -- the site renders `**word**`
// in italic serif and everything else in the regular sans font (see the
// Heading component in packages/ui). Admins can mark which words get that
// treatment; they can't change fonts directly.

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
  certificationsHeading: null,
  technologiesHeading: null,
  certificationsEnabled: true,
};

// Heading input with the click-a-word-to-highlight chips (`**word**` is the accent-coloured word).
function HighlightInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const highlighted = value.match(/\*\*(.+?)\*\*/)?.[1];
  const words = value.replace(/\*\*/g, "").split(/\s+/).filter(Boolean);
  const active = highlighted ? words.findIndex((w) => w === highlighted) : -1;
  return (
    <>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {words.length > 0 && (
        <div className="mt-2" role="group" aria-label="Highlight one word in the accent colour">
          <p className="text-body-sm text-neutral-500">Click a word to highlight it (click again to remove):</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {words.map((w, i) => (
              <button
                key={`${w}-${i}`}
                type="button"
                aria-pressed={i === active}
                onClick={() => onChange(words.map((x, j) => (j === i && i !== active ? `**${x}**` : x)).join(" "))}
                className={cn("rounded-full border px-3 py-1 text-body-sm transition-colors", i === active ? "border-accent-500 bg-accent-500 font-bold text-on-accent" : "border-neutral-300 text-heading hover:border-accent-500")}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export interface StoryController {
  dirty: boolean;
  saving: boolean;
  save: () => void;
}

function AboutStoryForm({ onController }: { onController: (c: StoryController) => void }) {
  const { data: content, loading } = useAsyncData<AboutContent | null>(
    () => request<{ item: AboutContent | null }>("/pages/about").then((r) => r.item),
    [],
  );
  const [form, setForm] = React.useState<AboutContent>(EMPTY_ABOUT_FORM);
  const [saving, setSaving] = React.useState(false);
  const [baseline, setBaseline] = React.useState("");

  React.useEffect(() => {
    // Pick only the editable fields -- the GET response also includes id/
    // seoId/updatedAt/seo (from `include: { seo: true }`), and naively
    // spreading the whole object back into the PUT body used to send Prisma
    // a raw `seo` object where it expects a nested-write shape, causing a
    // PrismaClientValidationError on every save.
    if (content) {
      const next = { ...EMPTY_ABOUT_FORM, ...content };
      setForm(next);
      setBaseline(JSON.stringify(next));
    }
  }, [content]);

  function set<K extends keyof AboutContent>(key: K, value: AboutContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await request("/pages/about", { method: "PUT", body: JSON.stringify(form) });
      setBaseline(JSON.stringify(form));
      toast.success("About page updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const dirty = baseline !== "" && JSON.stringify(form) !== baseline;
  const handleSaveRef = React.useRef(handleSave);
  handleSaveRef.current = handleSave;
  React.useEffect(() => {
    onController({ dirty, saving, save: () => handleSaveRef.current() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving]);

  if (loading) return <Skeleton className="h-96 w-full max-w-2xl" />;

  return (
    <div className="grid gap-x-6 gap-y-5 rounded-[12px] border border-neutral-200 bg-neutral-50 p-5 sm:p-8 lg:grid-cols-6">
      <Field label="Hero heading" className="lg:col-span-6">
        <HighlightInput value={form.heroHeading ?? ""} onChange={(v) => set("heroHeading", v || null)} placeholder="Our **story**, in plain terms." />
      </Field>
      <div className="lg:col-span-6">
        <Label>Story</Label>
        <Textarea rows={5} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:col-span-6">
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
      <div className="lg:col-span-2">
        <Label>Mission</Label>
        <Textarea rows={7} value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
      </div>
      <div className="lg:col-span-2">
        <Label>Vision</Label>
        <Textarea rows={7} value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} />
      </div>
      <div className="lg:col-span-2">
        <Label>Development philosophy</Label>
        <Textarea rows={7} value={form.philosophy} onChange={(e) => setForm({ ...form, philosophy: e.target.value })} />
      </div>
      <p className="text-body-sm text-neutral-400 lg:col-span-6">
        Years in business and projects shipped are managed from Home Page → Statistics, so they stay in sync everywhere they're shown.
      </p>

      <div className="grid gap-4 border-t border-neutral-200 pt-5 sm:grid-cols-2 xl:grid-cols-3 lg:col-span-6">
        <Field label="Core values heading">
          <HighlightInput value={form.valuesHeading ?? ""} onChange={(v) => set("valuesHeading", v || null)} placeholder="Core **values**" />
        </Field>
        <Field label="Timeline heading">
          <HighlightInput value={form.timelineHeading ?? ""} onChange={(v) => set("timelineHeading", v || null)} placeholder="Our **timeline**" />
        </Field>
        <Field label="Team heading">
          <HighlightInput value={form.teamHeading ?? ""} onChange={(v) => set("teamHeading", v || null)} placeholder="Meet the **team**" />
        </Field>
        <Field label="Certifications heading">
          <HighlightInput value={form.certificationsHeading ?? ""} onChange={(v) => set("certificationsHeading", v || null)} placeholder="Certifications" />
        </Field>
        <Field label="Technologies heading">
          <HighlightInput value={form.technologiesHeading ?? ""} onChange={(v) => set("technologiesHeading", v || null)} placeholder="The **stack** behind the work" />
        </Field>
      </div>

      <div className="flex items-center gap-2.5 border-t border-neutral-200 pt-5 lg:col-span-6">
        <Checkbox checked={form.certificationsEnabled} onCheckedChange={(c) => set("certificationsEnabled", c === true)} />
        <Label className="mb-0">Show Certifications section on the About page</Label>
      </div>

    </div>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {hint && <FieldHint hint={hint} />}
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
interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  year: string;
  description: string | null;
  imageId: string | null;
  image: { id: string; url: string } | null;
  url: string | null;
  order: number;
}
const certificationsClient = createResourceClient<CertificationItem>("/certifications");

type AboutTab = "story" | "values" | "timeline" | "certifications" | "sections" | "seo";

export default function AboutContentPage() {
  const [tab, setTab] = React.useState<AboutTab>("story");
  const [story, setStory] = React.useState<StoryController>({ dirty: false, saving: false, save: () => {} });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <div>
      <HomeHeader
        title="About page"
        description="Story, values, timeline, and certifications."
        tabs={
          <PageTabs
            tabs={[
              { value: "story", label: "Story" },
              { value: "values", label: "Core values" },
              { value: "timeline", label: "Timeline" },
              { value: "certifications", label: "Certifications" },
              { value: "sections", label: "Page sections" },
              { value: "seo", label: "SEO" },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
        chips={tab === "story" ? story.dirty ? <StatusChip tone="unsaved">Unsaved edits</StatusChip> : <StatusChip tone="saved">All changes saved</StatusChip> : null}
        actions={
          <>
            <a href={`${siteUrl}/about`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-300 px-4 text-[13px] font-bold text-heading transition-colors hover:border-accent-500 hover:text-accent-500">
              View page ↗
            </a>
            {tab === "story" && (
              <button type="button" onClick={story.save} disabled={story.saving || !story.dirty} className="inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-[13px] font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50">
                {story.saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as AboutTab)} className="mt-8">
        <TabsContent value="story">
          <AboutStoryForm onController={setStory} />
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
            description="Shown as an alternating left/right timeline on the About page."
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
              { key: "description", label: "Description", type: "textarea" },
              { key: "imageId", label: "Certificate image", type: "image", previewUrlKey: "imageUrl" },
              { key: "url", label: "URL", type: "url" },
              { key: "order", label: "Sort order", type: "number" },
            ]}
            defaultValues={{ name: "", issuer: "", year: "", description: "", imageId: null, imageUrl: null, url: "", order: 0 }}
            toFormValues={(item) => ({ ...item, imageUrl: item.image?.url ?? null })}
          />
        </TabsContent>
        <TabsContent value="sections">
          <AboutPageSettingsForm />
        </TabsContent>
        <TabsContent value="seo">
          <AboutSeoForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
