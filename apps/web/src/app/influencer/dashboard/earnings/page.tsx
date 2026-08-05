"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Checkbox,
  Heading,
  Input,
  Label,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@agency/ui";
import { PAYOUT_METHOD_TYPES, PAYOUT_METHOD_FIELDS_BY_TYPE, PAYOUT_STATUSES, type PayoutMethodTypeId } from "@agency/types";
import {
  deleteInfluencerPayoutMethod,
  getInfluencerEarnings,
  getInfluencerPayoutMethods,
  getInfluencerPayouts,
  submitInfluencerPayoutMethod,
} from "@/lib/influencer-api";
import type { InfluencerEarningsSummary, InfluencerPayoutListItemRead, InfluencerPayoutMethodRead } from "@/lib/influencer-types";

const ALL = "__all__";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <p className="text-label uppercase text-neutral-400">{label}</p>
      <p className="mt-2 text-h4 font-semibold text-heading">{value}</p>
      {hint && <p className="mt-1 text-body-sm text-neutral-500">{hint}</p>}
    </div>
  );
}

function payoutStatusVariant(status: string): "success" | "error" | "warning" | "accent" | "neutral" {
  if (status === "PAID" || status === "APPROVED") return "success";
  if (status === "FAILED" || status === "CANCELLED" || status === "REJECTED") return "error";
  if (status === "PENDING") return "warning";
  return "accent";
}

function formatMoney(value: string | number, currency = "") {
  return `${currency ? `${currency} ` : ""}${Number(value).toLocaleString()}`;
}

export default function InfluencerEarningsPage() {
  const [summary, setSummary] = React.useState<InfluencerEarningsSummary | null>(null);

  React.useEffect(() => {
    getInfluencerEarnings().then(setSummary);
  }, []);

  return (
    <div>
      <Heading level={2}>Earnings</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">What you've earned, your payout history, and where we send your money.</p>

      <PayoutMethods />

      {!summary ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total earned" value={Number(summary.totalEarned).toLocaleString()} hint={`${summary.completedCampaigns} completed campaigns`} />
          <StatCard label="Available balance" value={summary.availableBalance.toLocaleString()} hint="Ready to be included in your next payout" />
          <StatCard label="Pending payout" value={Number(summary.pendingPayout).toLocaleString()} hint="Payouts created but not yet paid" />
          <StatCard label="Total paid out" value={Number(summary.totalPaidOut).toLocaleString()} hint="Across all completed payouts" />
        </div>
      )}

      <PayoutHistory />
    </div>
  );
}

function PayoutHistory() {
  const [items, setItems] = React.useState<InfluencerPayoutListItemRead[] | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState(ALL);
  const [method, setMethod] = React.useState(ALL);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [search, status, method, dateFrom, dateTo]);

  React.useEffect(() => {
    setItems(null);
    getInfluencerPayouts({
      page,
      search: search || undefined,
      status: status === ALL ? undefined : status,
      method: method === ALL ? undefined : method,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).then((r) => {
      setItems(r.items);
      setTotalPages(r.totalPages);
    });
  }, [page, search, status, method, dateFrom, dateTo]);

  const hasActiveFilters = Boolean(search || status !== ALL || method !== ALL || dateFrom || dateTo);

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus(ALL);
    setMethod(ALL);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="mt-10">
      <h3 className="text-body-sm font-semibold text-heading">Payout history</h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label>Search</Label>
          <Input placeholder="Payout #…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {PAYOUT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All methods</SelectItem>
              {PAYOUT_METHOD_TYPES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>
          Clear filters
        </Button>
      )}

      <div className="mt-4">
        {!items ? (
          <Skeleton className="h-64 w-full" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">
            {hasActiveFilters ? "No payouts match your filters." : "No payouts yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payout #</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Processed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.payoutNumber}</TableCell>
                  <TableCell>{p.method.replace(/_/g, " ")}</TableCell>
                  <TableCell>{formatMoney(p.totalAmount, p.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={payoutStatusVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {items && items.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

function PayoutMethods() {
  const [methods, setMethods] = React.useState<InfluencerPayoutMethodRead[] | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [type, setType] = React.useState<PayoutMethodTypeId>("BANK_ACCOUNT");
  const [details, setDetails] = React.useState<Record<string, string>>({});
  const [isDefault, setIsDefault] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    getInfluencerPayoutMethods().then(setMethods);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function setDetailField(key: string, value: string) {
    setDetails((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmitMethod() {
    setSubmitting(true);
    try {
      await submitInfluencerPayoutMethod({ type, details, isDefault });
      toast.success("Payout method submitted for review");
      setShowForm(false);
      setDetails({});
      setIsDefault(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteInfluencerPayoutMethod(id);
      toast.success("Payout method removed");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-body-sm font-semibold text-heading">Payout methods</h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Add payout method"}
        </Button>
      </div>

      {!methods ? (
        <Skeleton className="mt-3 h-24 w-full" />
      ) : methods.length === 0 && !showForm ? (
        <div className="mt-3 rounded-2xl border border-neutral-200 p-6 text-center text-body-sm text-neutral-500">
          No payout methods on file yet.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {(methods ?? []).map((m) => (
            <div key={m.id} className="rounded-xl border border-neutral-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-medium text-heading">
                  {m.type.replace(/_/g, " ")} {m.isDefault && <Badge variant="accent">Default</Badge>}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={payoutStatusVariant(m.status)}>{m.status}</Badge>
                  {m.status !== "APPROVED" && (
                    <button onClick={() => handleDelete(m.id)} className="text-body-sm text-error-500 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 space-y-0.5 text-body-sm text-neutral-500">
                {Object.entries(m.details).map(([k, v]) => (
                  <p key={k}>
                    {k}: {v}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mt-4 space-y-4 rounded-2xl border border-neutral-200 p-5">
          <div>
            <Label>Payout method</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as PayoutMethodTypeId);
                setDetails({});
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_METHOD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {PAYOUT_METHOD_FIELDS_BY_TYPE[type].map((field) => (
            <div key={field.key}>
              <Label>{field.label}</Label>
              <Input value={details[field.key] ?? ""} onChange={(e) => setDetailField(field.key, e.target.value)} />
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Checkbox checked={isDefault} onCheckedChange={(c) => setIsDefault(c === true)} id="default-method" />
            <Label htmlFor="default-method" className="font-normal">
              Set as my default payout method
            </Label>
          </div>

          <Button onClick={handleSubmitMethod} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      )}
    </div>
  );
}
