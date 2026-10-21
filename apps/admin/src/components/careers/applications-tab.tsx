"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";

type Status = "NEW" | "CONTACTED" | "QUALIFIED" | "CLOSED" | "ARCHIVED";

interface Application {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  message: string;
  source: string | null;
  status: Status;
  createdAt: string;
}

const STATUS_LABELS: Record<Status, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Shortlisted",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};
const STATUSES = Object.keys(STATUS_LABELS) as Status[];

const cvOf = (a: Application) => a.message.match(/^CV: (\S+)/m)?.[1] ?? null;
const roleOf = (a: Application) => (a.source ?? "").replace(/^career:/, "");

function StatusSelect({ value, onChange, className }: { value: Status; onChange: (v: Status) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Status)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((k) => (
          <SelectItem key={k} value={k}>
            {STATUS_LABELS[k]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Job applications sent through the public Careers page (stored as contact submissions with source "career:<role>").
export function ApplicationsTab() {
  const [items, setItems] = React.useState<Application[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState<Application | null>(null);

  const load = React.useCallback(() => {
    const params = new URLSearchParams({ sourcePrefix: "career:", page: String(page), limit: "12" });
    if (search.trim()) params.set("search", search.trim());
    request<{ items: Application[]; total: number; totalPages: number }>(`/contact?${params}`)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        setPages(r.totalPages);
      })
      .catch(() => toast.error("Could not load applications"));
  }, [page, search]);

  React.useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function setStatus(a: Application, status: Status) {
    setItems((list) => list?.map((x) => (x.id === a.id ? { ...x, status } : x)) ?? null);
    setOpen((o) => (o?.id === a.id ? { ...o, status } : o));
    try {
      await request(`/contact/${a.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
      load();
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search applications"
          placeholder="Search by name, email or role…"
          className="h-10 max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <p className="text-label text-neutral-500">
          {total} application{total === 1 ? "" : "s"}
        </p>
      </div>

      {!items ? (
        <Skeleton className="mt-5 h-48 w-full" />
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-[10px] border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-body-sm text-neutral-500">
          No applications yet. They appear here when someone applies through the Careers page.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-[10px] border border-neutral-200 bg-neutral-50">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="bg-neutral-100 text-left font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5">Candidate</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Contact</th>
                <th className="px-4 py-2.5">Applied</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">CV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-100/60">
                  <td className="px-4 py-2.5">
                    <button type="button" onClick={() => setOpen(a)} className="text-left font-semibold text-heading hover:text-accent-500">
                      {a.name}
                    </button>
                    <p className="text-label text-neutral-500">{[a.city, a.country].filter(Boolean).join(", ")}</p>
                  </td>
                  <td className="px-4 py-2.5 text-heading">{roleOf(a)}</td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    <a href={`mailto:${a.email}`} className="block hover:text-accent-500">
                      {a.email}
                    </a>
                    <span className="text-label">{a.phone}</span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <StatusSelect value={a.status} onChange={(v) => setStatus(a, v)} className="h-9 w-36" />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {cvOf(a) ? (
                      <a href={cvOf(a)!} target="_blank" rel="noopener noreferrer" className="font-bold text-accent-500 hover:underline">
                        Open CV
                      </a>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-body-sm text-neutral-500">
            Page {page} of {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(null)}>
          <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col p-0">
            <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
              <DialogTitle>{open.name}</DialogTitle>
              <p className="text-body-sm text-neutral-500">{roleOf(open)}</p>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-body-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Email", open.email],
                  ["Phone", open.phone],
                  ["Location", [open.city, open.country].filter(Boolean).join(", ")],
                  ["Applied", new Date(open.createdAt).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-label text-neutral-500">{k}</dt>
                    <dd className="font-semibold text-heading">{v}</dd>
                  </div>
                ))}
              </dl>
              <pre className="whitespace-pre-wrap break-words rounded-[8px] border border-neutral-200 bg-neutral-100 p-3 font-sans text-[13px] text-heading">{open.message}</pre>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3">
              <StatusSelect value={open.status} onChange={(v) => setStatus(open, v)} className="h-10 w-40" />
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href={`mailto:${open.email}`}>Email</a>
                </Button>
                {cvOf(open) && (
                  <Button asChild>
                    <a href={cvOf(open)!} target="_blank" rel="noopener noreferrer">
                      Open CV
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
