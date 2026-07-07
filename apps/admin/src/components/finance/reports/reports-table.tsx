"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Eye } from "lucide-react";
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agency/ui";
import { EmptyState } from "@/components/admin-list-toolbar";
import type { ReportRow } from "./types";

const TYPE_BADGE: Record<ReportRow["type"], "accent" | "success" | "neutral"> = {
  QUOTATION: "neutral",
  INVOICE: "accent",
  PAYMENT: "success",
};

const STATUS_BADGE: Record<string, "neutral" | "accent" | "success" | "error" | "warning"> = {
  DRAFT: "neutral",
  SENT: "accent",
  ACCEPTED: "success",
  REJECTED: "error",
  EXPIRED: "warning",
  PENDING: "accent",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "error",
  CANCELLED: "neutral",
};

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Each row type has its own meaningful "date" beyond the transaction date --
// quotations expire, invoices fall due, payments were paid -- so the table
// shows whichever one applies, labeled, instead of three mostly-empty columns.
function contextualDate(row: ReportRow): { label: string; value: string | null } {
  if (row.type === "QUOTATION") return { label: "Expires", value: row.expiryDate };
  if (row.type === "PAYMENT") return { label: "Paid", value: row.paidDate };
  return { label: "Due", value: row.dueDate };
}

function SortableHead({
  column,
  label,
  sortBy,
  sortOrder,
  onSort,
  className,
}: {
  column: string;
  label: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string, order: "asc" | "desc") => void;
  className?: string;
}) {
  const active = sortBy === column;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column, active && sortOrder === "desc" ? "asc" : "desc")}
        className="flex items-center gap-1 hover:text-heading"
      >
        {label}
        {active && (sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </TableHead>
  );
}

export function ReportsTable({
  items,
  loading,
  hasActiveFilters,
  sortBy,
  sortOrder,
  onSort,
}: {
  items: ReportRow[];
  loading: boolean;
  hasActiveFilters: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string, order: "asc" | "desc") => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead column="date" label="Date" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <TableHead>Type</TableHead>
          <SortableHead column="invoiceNumber" label="Reference" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <SortableHead column="client" label="Client" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <TableHead>Project</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <SortableHead column="amount" label="Net amount" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="text-right" />
          <TableHead className="text-right">Balance due</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due / expiry / paid</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((row) => {
          const { label: dateLabel, value: dateValue } = contextualDate(row);
          return (
            <TableRow key={`${row.type}-${row.id}`}>
              <TableCell>{formatDate(row.date)}</TableCell>
              <TableCell>
                <Badge variant={TYPE_BADGE[row.type]}>{row.type}</Badge>
              </TableCell>
              <TableCell className="font-medium text-heading">{row.referenceNo}</TableCell>
              <TableCell>{row.clientName}</TableCell>
              <TableCell>{row.projectName ?? "—"}</TableCell>
              <TableCell className="text-right">{formatMoney(row.amount, row.currency)}</TableCell>
              <TableCell className="text-right font-medium text-heading">{formatMoney(row.netAmount, row.currency)}</TableCell>
              <TableCell className="text-right">{row.balanceDue !== null ? formatMoney(row.balanceDue, row.currency) : "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[row.status] ?? "neutral"}>{row.status.replace(/_/g, " ")}</Badge>
              </TableCell>
              <TableCell>
                {dateValue ? (
                  <span>
                    <span className="text-neutral-400">{dateLabel}: </span>
                    {formatDate(dateValue)}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="icon" aria-label="View details">
                  <Link href={`/finance/reports/${row.type.toLowerCase()}/${row.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {items.length === 0 && !loading && (
          <TableRow>
            <TableCell colSpan={11}>
              <EmptyState hasActiveFilters={hasActiveFilters} label="transactions" />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
