"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Copy, Trash2, Wallet, Download } from "lucide-react";
import { Badge, Button, Heading, Pagination, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { request } from "@/lib/api";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { buildPdfData } from "@/components/finance/pdf/map-to-pdf-data";
import { downloadFinancePdf } from "@/components/finance/pdf/download-pdf";
import type { PricingType } from "@agency/types";

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  currency: string;
  grandTotal: string;
  balance: string;
  client: { id: string; name: string };
}

interface InvoiceDetailForPdf {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  amountPaid: string;
  balance: string;
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

const statusVariant: Record<InvoiceListItem["status"], "neutral" | "accent" | "success" | "error" | "warning"> = {
  DRAFT: "neutral",
  SENT: "accent",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "error",
  CANCELLED: "neutral",
};

const statusOptions = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase().replace("_", " "),
}));

function formatMoney(value: string, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return `${currency} ${value}`;
  }
}

export default function InvoicesPage() {
  const list = usePaginatedList<InvoiceListItem>({
    endpoint: "/finance/invoices/admin",
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    filterKeys: ["status"],
  });
  const [payingInvoiceId, setPayingInvoiceId] = React.useState<string | null>(null);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  async function handleDownloadPdf(item: InvoiceListItem) {
    try {
      const { item: full } = await request<{ item: InvoiceDetailForPdf }>(`/finance/invoices/${item.id}`);
      await downloadFinancePdf(
        buildPdfData({
          kind: "INVOICE",
          number: full.invoiceNumber,
          issueDate: full.issueDate,
          secondDate: full.dueDate,
          secondDateLabel: "Due date",
          currency: full.currency,
          client: full.client,
          projectTitle: full.project?.title,
          items: full.items,
          subtotal: full.subtotal,
          discountTotal: full.discountTotal,
          taxTotal: full.taxTotal,
          grandTotal: full.grandTotal,
          amountPaid: full.amountPaid,
          balance: full.balance,
          notes: full.notes,
          terms: full.terms,
          signatureText: full.signatureText,
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate PDF");
    }
  }

  async function handleDuplicate(item: InvoiceListItem) {
    try {
      await request(`/finance/invoices/${item.id}/duplicate`, { method: "POST" });
      toast.success("Invoice duplicated");
      list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  function handleDelete(item: InvoiceListItem) {
    confirmDelete({
      title: `Delete invoice ${item.invoiceNumber}?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await request(`/finance/invoices/${item.id}`, { method: "DELETE" });
        toast.success("Deleted");
        list.reload();
      },
    });
  }

  const payingInvoice = (list.data ?? []).find((i) => i.id === payingInvoiceId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Invoices</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">Create, send, and track client invoices.</p>
        </div>
        <Button asChild>
          <Link href="/finance/invoices/new">
            <Plus /> New invoice
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search invoice number or notes…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={[
            { value: "invoiceNumber", label: "Invoice number" },
            { value: "issueDate", label: "Issue date" },
            { value: "dueDate", label: "Due date" },
            { value: "createdAt", label: "Date created" },
          ]}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[{ key: "status", label: "Status", options: statusOptions }]}
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
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/finance/invoices/${item.id}`} className="font-medium text-heading hover:underline">
                      {item.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{item.client?.name ?? "—"}</TableCell>
                  <TableCell>{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[item.status]}>{item.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>{formatMoney(item.grandTotal, item.currency)}</TableCell>
                  <TableCell>{formatMoney(item.balance, item.currency)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPayingInvoiceId(item.id)}
                        aria-label="Record payment"
                        disabled={Number(item.balance) <= 0}
                      >
                        <Wallet className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(item)} aria-label="Download PDF">
                        <Download className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(item)} aria-label="Duplicate">
                        <Copy className="size-4" />
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
                    <EmptyState hasActiveFilters={list.hasActiveFilters} label="invoices" />
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

      {payingInvoice && (
        <RecordPaymentDialog
          invoiceId={payingInvoice.id}
          invoiceOptions={[payingInvoice]}
          onClose={() => setPayingInvoiceId(null)}
          onSuccess={() => {
            setPayingInvoiceId(null);
            list.reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}
