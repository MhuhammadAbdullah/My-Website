"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Plus, Copy, ArrowRightLeft, Archive, ArchiveRestore, Trash2, Download } from "lucide-react";
import { Badge, Button, Heading, Pagination, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { request } from "@/lib/api";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { buildPdfData } from "@/components/finance/pdf/map-to-pdf-data";
import { downloadFinancePdf } from "@/components/finance/pdf/download-pdf";
import type { PricingType } from "@agency/types";

interface QuotationListItem {
  id: string;
  quoteNumber: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  issueDate: string;
  expiryDate: string;
  currency: string;
  grandTotal: string;
  isArchived: boolean;
  client: { id: string; name: string };
}

interface QuotationDetailForPdf {
  quoteNumber: string;
  issueDate: string;
  expiryDate: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  notes: string | null;
  terms: string | null;
  signatureText: string | null;
  client: { name: string; company: string | null; email: string | null; phone: string | null; address: string | null };
  project: { title: string } | null;
  items: {
    name: string;
    description: string | null;
    pricingType: PricingType;
    unitPrice: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: string;
    taxPercent: string;
    lineTotal: string;
  }[];
}

const statusVariant: Record<QuotationListItem["status"], "neutral" | "accent" | "success" | "error" | "warning"> = {
  DRAFT: "neutral",
  SENT: "accent",
  ACCEPTED: "success",
  REJECTED: "error",
  EXPIRED: "warning",
};

const statusOptions = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase(),
}));

function formatMoney(value: string, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return `${currency} ${value}`;
  }
}

function QuotationsPageInner() {
  const list = usePaginatedList<QuotationListItem>({
    endpoint: "/finance/quotations/admin",
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    filterKeys: ["status", "isArchived"],
  });
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  async function handleDuplicate(item: QuotationListItem) {
    try {
      await request(`/finance/quotations/${item.id}/duplicate`, { method: "POST" });
      toast.success("Quotation duplicated");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  async function handleConvert(item: QuotationListItem) {
    try {
      await request(`/finance/quotations/${item.id}/convert-to-invoice`, { method: "POST" });
      toast.success("Converted to invoice");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  async function handleArchiveToggle(item: QuotationListItem) {
    try {
      await request(`/finance/quotations/${item.id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ isArchived: !item.isArchived }),
      });
      toast.success(item.isArchived ? "Unarchived" : "Archived");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  async function handleDownloadPdf(item: QuotationListItem) {
    try {
      const { item: full } = await request<{ item: QuotationDetailForPdf }>(`/finance/quotations/${item.id}`);
      await downloadFinancePdf(
        buildPdfData({
          kind: "QUOTATION",
          number: full.quoteNumber,
          issueDate: full.issueDate,
          secondDate: full.expiryDate,
          secondDateLabel: "Expiry date",
          currency: full.currency,
          client: full.client,
          projectTitle: full.project?.title,
          items: full.items,
          subtotal: full.subtotal,
          discountTotal: full.discountTotal,
          taxTotal: full.taxTotal,
          grandTotal: full.grandTotal,
          notes: full.notes,
          terms: full.terms,
          signatureText: full.signatureText,
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate PDF");
    }
  }

  function handleDelete(item: QuotationListItem) {
    confirmDelete({
      title: `Delete quotation ${item.quoteNumber}?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`/finance/quotations/${item.id}`, { method: "DELETE" });
        toast.success("Deleted");
        list.reload();
      },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Quotations</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">Create and track client quotations.</p>
        </div>
        <Button asChild>
          <Link href="/finance/quotations/new">
            <Plus /> New quotation
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search quote number or notes…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={[
            { value: "quoteNumber", label: "Quote number" },
            { value: "issueDate", label: "Issue date" },
            { value: "expiryDate", label: "Expiry date" },
            { value: "createdAt", label: "Date created" },
          ]}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[
            { key: "status", label: "Status", options: statusOptions },
            { key: "isArchived", label: "Archived", options: [{ value: "true", label: "Archived only" }, { value: "false", label: "Active only" }] },
          ]}
          onFilterChange={list.setFilter}
          limit={list.limit}
          onLimitChange={list.setLimit}
          hasActiveFilters={list.hasActiveFilters}
          onClearFilters={list.clearFilters}
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : list.error ? (
          <p className="text-center text-body-sm text-error-500">{list.error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue date</TableHead>
                <TableHead>Expiry date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/finance/quotations/${item.id}`} className="font-medium text-heading hover:underline">
                      {item.quoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{item.client?.name ?? "—"}</TableCell>
                  <TableCell>{new Date(item.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                    {item.isArchived && <Badge variant="neutral" className="ml-1.5">Archived</Badge>}
                  </TableCell>
                  <TableCell>{formatMoney(item.grandTotal, item.currency)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(item)} aria-label="Download PDF">
                        <Download className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(item)} aria-label="Duplicate">
                        <Copy className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleConvert(item)} aria-label="Convert to invoice">
                        <ArrowRightLeft className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleArchiveToggle(item)} aria-label={item.isArchived ? "Unarchive" : "Archive"}>
                        {item.isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} aria-label="Delete">
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(list.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState hasActiveFilters={list.hasActiveFilters} label="quotations" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!list.loading && !list.error && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <ListSummary meta={list.meta} />
          <Pagination page={list.page} totalPages={list.meta?.totalPages ?? 1} onPageChange={list.setPage} />
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense fallback={null}>
      <QuotationsPageInner />
    </Suspense>
  );
}
