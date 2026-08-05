"use client";

import * as React from "react";
import Link from "next/link";
import {
  Badge,
  Button,
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
} from "@agency/ui";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, CAMPAIGN_TYPES, type BookingStatusId } from "@agency/types";
import { getInfluencerBookings } from "@/lib/influencer-api";
import type { BookingListItemRead } from "@/lib/influencer-types";

function statusVariant(status: string): "success" | "error" | "warning" | "accent" | "neutral" {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED" || status === "DISPUTED" || status === "DECLINED_BY_INFLUENCER") return "error";
  if (status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "AWAITING_PAYMENT") return "warning";
  return "accent";
}

const ALL = "__all__";

export default function InfluencerBookingsPage() {
  const [items, setItems] = React.useState<BookingListItemRead[] | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState(ALL);
  const [campaignType, setCampaignType] = React.useState(ALL);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  // Debounce the search box so we don't fire a request per keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [search, status, campaignType, dateFrom, dateTo]);

  React.useEffect(() => {
    setItems(null);
    getInfluencerBookings({
      page,
      search: search || undefined,
      status: status === ALL ? undefined : status,
      campaignType: campaignType === ALL ? undefined : campaignType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).then((r) => {
      setItems(r.items);
      setTotalPages(r.totalPages);
    });
  }, [page, search, status, campaignType, dateFrom, dateTo]);

  const hasActiveFilters = Boolean(search || status !== ALL || campaignType !== ALL || dateFrom || dateTo);

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus(ALL);
    setCampaignType(ALL);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div>
      <Heading level={2}>Bookings</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Campaign requests booked with you — accept, decline, or mark delivered.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label>Search</Label>
          <Input placeholder="Booking #, company, campaign type…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {BOOKING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {BOOKING_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Campaign type</Label>
          <Select value={campaignType} onValueChange={setCampaignType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {CAMPAIGN_TYPES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
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

      <div className="mt-6">
        {!items ? (
          <Skeleton className="h-64 w-full" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">
            {hasActiveFilters ? "No bookings match your filters." : "No bookings yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Campaign type</TableHead>
                <TableHead>Booking date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.bookingNumber}</TableCell>
                  <TableCell>{b.businessName}</TableCell>
                  <TableCell>{b.campaignType}</TableCell>
                  <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(b.status)}>{BOOKING_STATUS_LABELS[b.status as BookingStatusId] ?? b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {b.netInfluencerEarning && Number(b.netInfluencerEarning) > 0 ? Number(b.netInfluencerEarning).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/influencer/dashboard/bookings/${b.id}`}>View</Link>
                    </Button>
                  </TableCell>
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
