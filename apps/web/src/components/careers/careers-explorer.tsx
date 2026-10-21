"use client";

import * as React from "react";
import { ArrowUpRight, Briefcase, ChevronRight, MapPin, Search, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, cn } from "@agency/ui";
import type { CareersPageSettings } from "@agency/types";
import { ApplyDialog } from "@/components/careers/apply-dialog";

type Position = CareersPageSettings["positions"][number];
type Apply = CareersPageSettings["apply"];
type Labels = CareersPageSettings["labels"];

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-label font-semibold text-neutral-600">{children}</span>;
}

function Meta({ job }: { job: Position }) {
  return (
    <div className="flex flex-wrap gap-2">
      {job.location && (
        <Chip>
          <MapPin className="size-3" aria-hidden /> {job.location}
        </Chip>
      )}
      {job.type && (
        <Chip>
          <Briefcase className="size-3" aria-hidden /> {job.type}
        </Chip>
      )}
      {job.mode && <Chip>{job.mode}</Chip>}
      {job.salary && (
        <Chip>
          <Wallet className="size-3" aria-hidden /> {job.salary}
        </Chip>
      )}
    </div>
  );
}

const applyClass = "inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-body-sm font-bold text-on-accent hover:opacity-90";

// Cards keep one fixed shape; the full description opens in a popup so a long role never stretches its neighbour.
function JobCard({ job, apply, labels, onDetails, onApply }: { job: Position; apply: Apply; labels: Labels; onDetails: () => void; onApply: () => void }) {
  const hasDetails = job.responsibilities.length > 0 || job.requirements.length > 0;
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {job.department && <p className="text-label font-semibold uppercase tracking-wider text-accent-500">{job.department}</p>}
          <h3 className="mt-1 font-heading text-h4 font-extrabold text-heading">{job.title}</h3>
        </div>
        {job.level && <Chip>{job.level}</Chip>}
      </div>

      <div className="mt-4">
        <Meta job={job} />
      </div>

      {job.summary && <p className="mt-4 line-clamp-3 text-body-sm text-neutral-500">{job.summary}</p>}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
        {hasDetails || job.summary ? (
          <button type="button" onClick={onDetails} className="inline-flex items-center gap-1 text-body-sm font-semibold text-heading hover:text-accent-500">
            {labels.details}
            <ChevronRight className="size-4" aria-hidden />
          </button>
        ) : (
          <span />
        )}
        {job.applyUrl.trim() ? (
          <a href={job.applyUrl.trim()} target="_blank" rel="noopener noreferrer" className={applyClass}>
            {apply.buttonLabel} <ArrowUpRight className="size-4" aria-hidden />
          </a>
        ) : (
          <button type="button" onClick={onApply} className={applyClass}>
            {apply.buttonLabel} <ArrowUpRight className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}

function DetailsDialog({ job, apply, labels, onClose, onApply }: { job: Position; apply: Apply; labels: Labels; onClose: () => void; onApply: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-6 py-5">
          {job.department && <p className="text-label font-semibold uppercase tracking-wider text-accent-500">{job.department}</p>}
          <DialogTitle>{job.title}</DialogTitle>
          <DialogDescription className="sr-only">Role details for {job.title}</DialogDescription>
          <div className="pt-2">
            <Meta job={job} />
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {job.summary && <p className="text-body text-neutral-500">{job.summary}</p>}
          <div className="grid gap-6 sm:grid-cols-2">
            {job.responsibilities.length > 0 && (
              <div>
                <p className="text-body-sm font-bold text-heading">{labels.responsibilities}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-body-sm text-neutral-500">
                  {job.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {job.requirements.length > 0 && (
              <div>
                <p className="text-body-sm font-bold text-heading">{labels.requirements}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-body-sm text-neutral-500">
                  {job.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {apply.note && <p className="text-body-sm text-neutral-500">{apply.note}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-neutral-300 px-5 py-2.5 text-body-sm font-semibold text-heading hover:border-accent-500">
            Close
          </button>
          {job.applyUrl.trim() ? (
            <a href={job.applyUrl.trim()} target="_blank" rel="noopener noreferrer" className={applyClass}>
              {apply.buttonLabel} <ArrowUpRight className="size-4" aria-hidden />
            </a>
          ) : (
            <button type="button" onClick={onApply} className={applyClass}>
              {apply.buttonLabel} <ArrowUpRight className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CareersExplorer({ positions, apply, labels }: { positions: Position[]; apply: Apply; labels: Labels }) {
  const [department, setDepartment] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [detail, setDetail] = React.useState<Position | null>(null);
  const [applyFor, setApplyFor] = React.useState<Position | null>(null);
  const departments = React.useMemo(() => [...new Set(positions.map((p) => p.department).filter(Boolean))], [positions]);
  const q = query.trim().toLowerCase();
  const shown = positions.filter(
    (p) => (!department || p.department === department) && (!q || `${p.title} ${p.department} ${p.location} ${p.summary}`.toLowerCase().includes(q)),
  );

  return (
    <div>
      <div className="flex flex-col gap-4 border-y border-neutral-200 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter by department" className="flex min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["", ...departments].map((d) => (
            <button
              key={d || "all"}
              type="button"
              aria-pressed={department === d}
              onClick={() => setDepartment(d)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-body-sm font-bold transition-colors",
                department === d ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-200 text-heading hover:border-accent-500",
              )}
            >
              {d || labels.all}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            className="h-11 w-full rounded-full border border-neutral-200 bg-background pl-11 pr-4 text-body-sm text-heading outline-none placeholder:text-neutral-400 focus:border-accent-500"
          />
        </div>
      </div>

      <p className="mt-5 text-body-sm text-neutral-500">{labels.openRoles.replace("{n}", String(shown.length))}</p>

      <div className="mt-5 grid auto-rows-fr gap-5 md:grid-cols-2">
        {shown.map((job) => (
          <JobCard key={job.id} job={job} apply={apply} labels={labels} onDetails={() => setDetail(job)} onApply={() => setApplyFor(job)} />
        ))}
      </div>

      {detail && (
        <DetailsDialog
          job={detail}
          apply={apply}
          labels={labels}
          onClose={() => setDetail(null)}
          onApply={() => {
            setApplyFor(detail);
            setDetail(null);
          }}
        />
      )}
      {applyFor && <ApplyDialog position={applyFor.title} open onOpenChange={(o) => !o && setApplyFor(null)} />}
    </div>
  );
}
