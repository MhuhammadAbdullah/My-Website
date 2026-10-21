"use client";

import * as React from "react";
import { Briefcase, ExternalLink, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
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
  Switch,
  Textarea,
  cn,
  toast,
} from "@agency/ui";
import { JOB_MODES, JOB_TYPES, careersPageSchema, type CareersPageSettings, type JobPosition } from "@agency/types";
import { request } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import { InfoHint } from "@/components/field-hint";
import { HomeHeader, PageTabs, StatusChip } from "@/components/home/home-header";
import { ApplicationsTab } from "@/components/careers/applications-tab";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const lines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);
const newId = () => Math.random().toString(36).slice(2, 10);
const blankJob = (): JobPosition => ({
  id: newId(),
  title: "",
  department: "",
  location: "",
  type: "Full-time",
  mode: "On-site",
  level: "",
  salary: "",
  summary: "",
  responsibilities: [],
  requirements: [],
  applyUrl: "",
  open: true,
});

type Tab = "positions" | "applications" | "content";

export default function CareersAdminPage() {
  const { can } = usePermissions();
  const canEdit = can("settings", "update");
  const [cfg, setCfg] = React.useState<CareersPageSettings | null>(null);
  const [baseline, setBaseline] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("positions");
  const [editing, setEditing] = React.useState<JobPosition | null>(null);
  const [isNew, setIsNew] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    request<{ settings: { careers_page?: unknown } }>("/settings")
      .then((r) => {
        const parsed = careersPageSchema.parse(r.settings.careers_page ?? {});
        setCfg(parsed);
        setBaseline(JSON.stringify(parsed));
      })
      .catch(() => toast.error("Could not load the careers page"));
  }, []);

  const dirty = cfg !== null && JSON.stringify(cfg) !== baseline;

  async function save(next: CareersPageSettings = cfg!) {
    const parsed = careersPageSchema.safeParse(next);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the fields");
    setSaving(true);
    try {
      await request("/settings/careers_page", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      setCfg(parsed.data);
      setBaseline(JSON.stringify(parsed.data));
      toast.success("Saved — the Careers page updates within a few minutes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return <Skeleton className="h-96 w-full" />;

  const departments = [...new Set(cfg.positions.map((p) => p.department).filter(Boolean))];
  const openCount = cfg.positions.filter((p) => p.open).length;
  const q = search.trim().toLowerCase();
  const shown = cfg.positions.filter((p) => !q || `${p.title} ${p.department} ${p.location}`.toLowerCase().includes(q));

  function commitJob(job: JobPosition) {
    const exists = cfg!.positions.some((p) => p.id === job.id);
    const next = { ...cfg!, positions: exists ? cfg!.positions.map((p) => (p.id === job.id ? job : p)) : [...cfg!.positions, job] };
    setEditing(null);
    void save(next);
  }

  function removeJob(job: JobPosition) {
    if (!window.confirm(`Delete "${job.title}"? It disappears from the Careers page.`)) return;
    void save({ ...cfg!, positions: cfg!.positions.filter((p) => p.id !== job.id) });
  }

  function toggleOpen(job: JobPosition, open: boolean) {
    void save({ ...cfg!, positions: cfg!.positions.map((p) => (p.id === job.id ? { ...p, open } : p)) });
  }

  return (
    <div>
      <HomeHeader
        title="Careers"
        description="Hiring positions shown on the public Careers page: roles, departments, how to apply."
        tabs={
          <PageTabs
            tabs={[
              { value: "positions", label: `Positions (${cfg.positions.length})` },
              { value: "applications", label: "Applications" },
              { value: "content", label: "Page content" },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
        chips={
          <>
            <StatusChip tone="saved">{openCount} open</StatusChip>
            {dirty && tab === "content" && <StatusChip tone="unsaved">Unsaved edits</StatusChip>}
          </>
        }
        actions={
          <>
            <a href={`${siteUrl}/careers`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-300 px-4 text-[13px] font-bold text-heading transition-colors hover:border-accent-500 hover:text-accent-500">
              View page <ExternalLink className="size-3.5" aria-hidden />
            </a>
            {canEdit && tab === "positions" && (
              <button
                type="button"
                onClick={() => {
                  setIsNew(true);
                  setEditing(blankJob());
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent-500 px-5 text-[13px] font-bold text-on-accent hover:opacity-90"
              >
                <Plus className="size-4" aria-hidden /> Add position
              </button>
            )}
            {canEdit && tab === "content" && (
              <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-[13px] font-bold text-on-accent hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </>
        }
      />

      {tab === "applications" ? (
        <ApplicationsTab />
      ) : tab === "positions" ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Input aria-label="Search positions" placeholder="Search positions…" className="h-10 max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
            {departments.length > 0 && <p className="text-label text-neutral-500">Departments: {departments.join(" · ")}</p>}
          </div>

          {cfg.positions.length === 0 ? (
            <div className="mt-5 rounded-[10px] border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
              <p className="font-heading text-[1.25rem] font-extrabold text-heading">No positions yet</p>
              <p className="mt-2 text-body-sm text-neutral-500">Add your first role. Until a role is open, the Careers page shows the "no open roles" message.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((job) => (
                <section key={job.id} className={cn("flex flex-col rounded-[10px] border border-neutral-200 bg-neutral-50 p-5", !job.open && "opacity-70")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {job.department && <p className="text-label font-semibold uppercase tracking-wider text-accent-500">{job.department}</p>}
                      <h3 className="mt-0.5 font-heading text-[1.0625rem] font-extrabold tracking-tight text-heading">{job.title}</h3>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-label text-neutral-500">
                      {job.open ? "Open" : "Closed"}
                      <Switch checked={job.open} disabled={!canEdit || saving} onCheckedChange={(v) => toggleOpen(job, v)} aria-label={`${job.title} is open for applications`} />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-label text-neutral-500">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5">
                        <MapPin className="size-3" aria-hidden /> {job.location}
                      </span>
                    )}
                    {[job.type, job.mode, job.level].filter(Boolean).map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5">
                        {t === job.type && <Briefcase className="size-3" aria-hidden />} {t}
                      </span>
                    ))}
                  </div>
                  {job.summary && <p className="mt-3 line-clamp-2 text-[13px] text-neutral-500">{job.summary}</p>}
                  {canEdit && (
                    <div className="mt-auto flex gap-2 border-t border-neutral-200 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-0 flex-1"
                        onClick={() => {
                          setIsNew(false);
                          setEditing(job);
                        }}
                      >
                        <Pencil /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="border-error-500/40 text-error-500 hover:bg-error-500/10" onClick={() => removeJob(job)} aria-label={`Delete ${job.title}`}>
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ContentTab cfg={cfg} setCfg={setCfg} />
      )}

      {editing && <JobDialog job={editing} isNew={isNew} departments={departments} onClose={() => setEditing(null)} onSave={commitJob} />}
    </div>
  );
}

function JobDialog({ job, isNew, departments, onClose, onSave }: { job: JobPosition; isNew: boolean; departments: string[]; onClose: () => void; onSave: (j: JobPosition) => void }) {
  const [j, setJ] = React.useState(job);
  const [resp, setResp] = React.useState(job.responsibilities.join("\n"));
  const [req, setReq] = React.useState(job.requirements.join("\n"));
  const set = <K extends keyof JobPosition>(k: K, v: JobPosition[K]) => setJ((x) => ({ ...x, [k]: v }));

  function submit() {
    if (!j.title.trim()) return toast.error("Give the position a title");
    onSave({ ...j, title: j.title.trim(), responsibilities: lines(resp), requirements: lines(req) });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-4xl flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>{isNew ? "New position" : `Edit ${job.title || "position"}`}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Job title</Label>
              <Input value={j.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Frontend Developer" />
            </div>
            <div>
              <Label>Department</Label>
              <Input list="career-departments" value={j.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Engineering, Design, Marketing" />
              <datalist id="career-departments">
                {departments.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Employment type</Label>
              <Select value={j.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Work mode</Label>
              <Select value={j.mode} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_MODES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={j.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Karachi" />
            </div>
            <div>
              <Label>Level</Label>
              <Input value={j.level} onChange={(e) => set("level", e.target.value)} placeholder="e.g. Junior, Mid, Senior" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Salary (optional)</Label>
              <Input value={j.salary} onChange={(e) => set("salary", e.target.value)} placeholder="e.g. PKR 150k–250k / month" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Label>Apply link (optional)</Label>
                <InfoHint text="Leave empty to send applicants to the apply email set in Page content. Paste a form link (https://…) to use your own form." />
              </div>
              <Input value={j.applyUrl} onChange={(e) => set("applyUrl", e.target.value)} placeholder="https://… or leave empty" />
            </div>
          </div>

          <div>
            <Label>Short summary</Label>
            <Textarea rows={3} value={j.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Two or three sentences about the role." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Label>What they will do</Label>
                <InfoHint text="One point per line." />
              </div>
              <Textarea rows={6} value={resp} onChange={(e) => setResp(e.target.value)} placeholder={"Build and ship client websites\nReview teammates' work"} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Label>What we look for</Label>
                <InfoHint text="One point per line." />
              </div>
              <Textarea rows={6} value={req} onChange={(e) => setReq(e.target.value)} placeholder={"3+ years of experience\nStrong communication"} />
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-[8px] border border-neutral-200 px-4 py-3">
            <span>
              <span className="block text-body-sm font-medium text-heading">Open for applications</span>
              <span className="block text-label text-neutral-500">Closed positions are hidden from the public page but stay saved here.</span>
            </span>
            <Switch checked={j.open} onCheckedChange={(v) => set("open", v)} />
          </label>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{isNew ? "Add position" : "Save position"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContentTab({ cfg, setCfg }: { cfg: CareersPageSettings; setCfg: React.Dispatch<React.SetStateAction<CareersPageSettings | null>> }) {
  const card = "rounded-[10px] border border-neutral-200 bg-neutral-50 p-5";
  const head = "font-heading font-extrabold tracking-tight text-heading";
  const upd = (patch: Partial<CareersPageSettings>) => setCfg((c) => (c ? { ...c, ...patch } : c));
  return (
    <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
      <section className={cn(card, "grid gap-4")}>
        <h3 className={head}>Page heading</h3>
        <div>
          <Label>Small label</Label>
          <Input value={cfg.hero.eyebrow} onChange={(e) => upd({ hero: { ...cfg.hero, eyebrow: e.target.value } })} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <Label>Heading</Label>
            <InfoHint text="Wrap a word in **double stars** to highlight it in the accent colour." />
          </div>
          <Input value={cfg.hero.heading} onChange={(e) => upd({ hero: { ...cfg.hero, heading: e.target.value } })} />
        </div>
        <div>
          <Label>Intro text</Label>
          <Textarea rows={3} value={cfg.hero.intro} onChange={(e) => upd({ hero: { ...cfg.hero, intro: e.target.value } })} />
        </div>
      </section>

      <section className={cn(card, "grid gap-4")}>
        <div>
          <h3 className={head}>How people apply</h3>
          <p className="mt-1 text-label text-neutral-500">The Apply button opens a form for the candidate details and CV. Their applications arrive in the Applications tab.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Apply button label</Label>
            <Input value={cfg.apply.buttonLabel} onChange={(e) => upd({ apply: { ...cfg.apply, buttonLabel: e.target.value } })} />
          </div>
          <div>
            <Label>Note under the roles</Label>
            <Input value={cfg.apply.note} onChange={(e) => upd({ apply: { ...cfg.apply, note: e.target.value } })} />
          </div>
        </div>
      </section>

      <section className={cn(card, "grid gap-4 xl:col-span-2")}>
        <div className="flex items-center justify-between gap-3">
          <h3 className={head}>Why work with us</h3>
          {cfg.perks.length < 8 && (
            <Button variant="outline" size="sm" onClick={() => upd({ perks: [...cfg.perks, { title: "", text: "" }] })}>
              <Plus /> Add point
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {cfg.perks.map((perk, i) => (
            <div key={i} className="grid gap-2 rounded-[8px] border border-neutral-200 p-3">
              <div className="flex items-center gap-2">
                <Input aria-label="Title" value={perk.title} placeholder="Title" onChange={(e) => upd({ perks: cfg.perks.map((p, j) => (j === i ? { ...p, title: e.target.value } : p)) })} />
                <button type="button" aria-label="Remove point" onClick={() => upd({ perks: cfg.perks.filter((_, j) => j !== i) })} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-error-500 hover:bg-error-500/10">
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
              <Textarea aria-label="Text" rows={3} value={perk.text} placeholder="Short description" onChange={(e) => upd({ perks: cfg.perks.map((p, j) => (j === i ? { ...p, text: e.target.value } : p)) })} />
            </div>
          ))}
        </div>
      </section>

      <section className={cn(card, "grid gap-4")}>
        <h3 className={head}>When no roles are open</h3>
        <div>
          <Label>Heading</Label>
          <Input value={cfg.empty.heading} onChange={(e) => upd({ empty: { ...cfg.empty, heading: e.target.value } })} />
        </div>
        <div>
          <Label>Text</Label>
          <Textarea rows={3} value={cfg.empty.text} onChange={(e) => upd({ empty: { ...cfg.empty, text: e.target.value } })} />
        </div>
      </section>

      <section className={cn(card, "grid gap-4")}>
        <h3 className={head}>Closing block</h3>
        <div>
          <Label>Heading</Label>
          <Input value={cfg.cta.heading} onChange={(e) => upd({ cta: { ...cfg.cta, heading: e.target.value } })} />
        </div>
        <div>
          <Label>Text</Label>
          <Textarea rows={3} value={cfg.cta.text} onChange={(e) => upd({ cta: { ...cfg.cta, text: e.target.value } })} />
        </div>
        <div>
          <Label>Button label</Label>
          <Input value={cfg.cta.buttonLabel} onChange={(e) => upd({ cta: { ...cfg.cta, buttonLabel: e.target.value } })} />
        </div>
      </section>
    </div>
  );
}
