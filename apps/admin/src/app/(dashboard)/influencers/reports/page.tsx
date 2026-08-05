"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  Badge,
  Button,
  Heading,
  Input,
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
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { downloadBlob } from "@/lib/download-blob";

type ReportType = "bookings" | "payouts" | "top-influencers" | "top-categories";

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "bookings", label: "Bookings & revenue" },
  { value: "payouts", label: "Payouts & earnings" },
  { value: "top-influencers", label: "Top influencers" },
  { value: "top-categories", label: "Top categories" },
];

const DATE_PRESET_OPTIONS = [
  { value: "last30days", label: "Last 30 days" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisQuarter", label: "This quarter" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom range" },
  { value: "all", label: "All time" },
];

interface BookingRow {
  bookingNumber: string;
  influencer: string;
  businessName: string;
  campaignType: string;
  status: string;
  grossAmount: number;
  discountAmount: number;
  commissionAmount: number;
  netInfluencerEarning: number;
  createdAt: string;
  completedAt: string;
}

interface PayoutRow {
  payoutNumber: string;
  influencer: string;
  status: string;
  totalAmount: number;
  currency: string;
  method: string;
  createdAt: string;
  processedAt: string;
}

interface TopInfluencerRow {
  influencer: string;
  completedCampaigns: number;
  revenue: number;
  netEarning: number;
}

interface TopCategoryRow {
  name: string;
  influencerCount: number;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  function cell(value: string | number) {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }
  return [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n");
}

export default function InfluencerReportsPage() {
  const [reportType, setReportType] = React.useState<ReportType>("bookings");
  const [datePreset, setDatePreset] = React.useState("last30days");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const needsDateRange = reportType === "bookings" || reportType === "payouts" || reportType === "top-influencers";
  const dateQuery =
    needsDateRange && datePreset !== "all"
      ? `?datePreset=${datePreset}${datePreset === "custom" ? `&dateFrom=${dateFrom}&dateTo=${dateTo}` : ""}`
      : "";

  const { data, loading } = useAsyncData<{ items: unknown[]; totals?: Record<string, number> }>(
    () => request(`/influencer-reports/admin/${reportType}${dateQuery}`),
    [reportType, dateQuery],
  );

  function handleExport() {
    if (!data) return;
    const stamp = new Date().toISOString().slice(0, 10);
    let csv = "";
    if (reportType === "bookings") {
      const rows = data.items as BookingRow[];
      csv = toCsv(
        ["Booking #", "Influencer", "Business", "Campaign type", "Status", "Gross", "Discount", "Commission", "Net earning", "Created", "Completed"],
        rows.map((r) => [
          r.bookingNumber,
          r.influencer,
          r.businessName,
          r.campaignType,
          r.status,
          r.grossAmount,
          r.discountAmount,
          r.commissionAmount,
          r.netInfluencerEarning,
          r.createdAt,
          r.completedAt,
        ]),
      );
    } else if (reportType === "payouts") {
      const rows = data.items as PayoutRow[];
      csv = toCsv(
        ["Payout #", "Influencer", "Status", "Amount", "Currency", "Method", "Created", "Processed"],
        rows.map((r) => [r.payoutNumber, r.influencer, r.status, r.totalAmount, r.currency, r.method, r.createdAt, r.processedAt]),
      );
    } else if (reportType === "top-influencers") {
      const rows = data.items as TopInfluencerRow[];
      csv = toCsv(
        ["Influencer", "Completed campaigns", "Revenue", "Net earning"],
        rows.map((r) => [r.influencer, r.completedCampaigns, r.revenue, r.netEarning]),
      );
    } else {
      const rows = data.items as TopCategoryRow[];
      csv = toCsv(["Category", "Influencer count"], rows.map((r) => [r.name, r.influencerCount]));
    }
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `influencer-${reportType}-${stamp}.csv`);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Reports</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Bookings, payouts, and performance reports for the Influencer Marketplace.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!data || loading}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsDateRange && (
          <>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESET_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {datePreset === "custom" && (
              <>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </>
            )}
          </>
        )}
      </div>

      <div className="mt-6">
        {loading || !data ? (
          <Skeleton className="h-80 w-full" />
        ) : reportType === "bookings" ? (
          <BookingsTable items={data.items as BookingRow[]} totals={data.totals} />
        ) : reportType === "payouts" ? (
          <PayoutsTable items={data.items as PayoutRow[]} totals={data.totals} />
        ) : reportType === "top-influencers" ? (
          <TopInfluencersTable items={data.items as TopInfluencerRow[]} />
        ) : (
          <TopCategoriesTable items={data.items as TopCategoryRow[]} />
        )}
      </div>
    </div>
  );
}

function BookingsTable({ items, totals }: { items: BookingRow[]; totals?: Record<string, number> }) {
  return (
    <>
      {totals && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Gross revenue" value={totals.grossAmount ?? 0} />
          <SummaryCard label="Commission earned" value={totals.commissionAmount ?? 0} />
          <SummaryCard label="Influencer earnings" value={totals.netInfluencerEarning ?? 0} />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking #</TableHead>
            <TableHead>Influencer</TableHead>
            <TableHead>Business</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Gross</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Net earning</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.bookingNumber}>
              <TableCell className="font-medium text-heading">{r.bookingNumber}</TableCell>
              <TableCell>{r.influencer}</TableCell>
              <TableCell>{r.businessName}</TableCell>
              <TableCell>
                <Badge variant="neutral">{r.status}</Badge>
              </TableCell>
              <TableCell>{r.grossAmount.toLocaleString()}</TableCell>
              <TableCell>{r.commissionAmount.toLocaleString()}</TableCell>
              <TableCell>{r.netInfluencerEarning.toLocaleString()}</TableCell>
              <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-neutral-400">
                No bookings in this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

function PayoutsTable({ items, totals }: { items: PayoutRow[]; totals?: Record<string, number> }) {
  return (
    <>
      {totals && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Total payouts" value={totals.totalAmount ?? 0} />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payout #</TableHead>
            <TableHead>Influencer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.payoutNumber}>
              <TableCell className="font-medium text-heading">{r.payoutNumber}</TableCell>
              <TableCell>{r.influencer}</TableCell>
              <TableCell>
                <Badge variant="neutral">{r.status}</Badge>
              </TableCell>
              <TableCell>
                {r.currency} {r.totalAmount.toLocaleString()}
              </TableCell>
              <TableCell>{r.method.replace(/_/g, " ")}</TableCell>
              <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-neutral-400">
                No payouts in this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

function TopInfluencersTable({ items }: { items: TopInfluencerRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Influencer</TableHead>
          <TableHead>Completed campaigns</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead>Net earning</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((r) => (
          <TableRow key={r.influencer}>
            <TableCell className="font-medium text-heading">{r.influencer}</TableCell>
            <TableCell>{r.completedCampaigns}</TableCell>
            <TableCell>{r.revenue.toLocaleString()}</TableCell>
            <TableCell>{r.netEarning.toLocaleString()}</TableCell>
          </TableRow>
        ))}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-neutral-400">
              No completed bookings in this range.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function TopCategoriesTable({ items }: { items: TopCategoryRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>Influencers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((r) => (
          <TableRow key={r.name}>
            <TableCell className="font-medium text-heading">{r.name}</TableCell>
            <TableCell>{r.influencerCount}</TableCell>
          </TableRow>
        ))}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={2} className="text-center text-neutral-400">
              No categories yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <p className="text-label uppercase text-neutral-400">{label}</p>
      <p className="mt-1 text-h5 font-semibold text-heading">{value.toLocaleString()}</p>
    </div>
  );
}
