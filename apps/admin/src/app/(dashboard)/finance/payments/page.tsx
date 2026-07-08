"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button, Heading, Pagination, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";

interface PaymentListItem {
  id: string;
  amount: string;
  currency: string;
  paymentDate: string;
  method: string;
  transactionId: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    client: { id: string; name: string };
    project: { id: string; title: string } | null;
  };
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  currency: string;
  balance: string;
  client: { name: string };
}

const paymentMethods = ["CASH", "BANK_TRANSFER", "STRIPE", "PAYPAL", "WISE", "JAZZCASH", "EASYPAISA", "CUSTOM"].map((v) => ({
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

function PaymentsPageInner() {
  const list = usePaginatedList<PaymentListItem>({
    endpoint: "/finance/payments/admin",
    defaultSortBy: "paymentDate",
    defaultSortOrder: "desc",
    filterKeys: ["method"],
  });
  const [showDialog, setShowDialog] = React.useState(false);

  const { data: invoices } = useAsyncData<InvoiceOption[]>(
    () => request<{ items: InvoiceOption[] }>("/finance/invoices/admin?limit=100").then((r) => r.items),
    [],
  );
  const payableInvoices = (invoices ?? []).filter((inv) => Number(inv.balance) > 0);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  function handleDelete(item: PaymentListItem) {
    confirmDelete({
      title: "Delete this payment?",
      description: "The invoice balance will be recalculated. This action cannot be undone.",
      onConfirm: async () => {
        await request(`/finance/payments/${item.id}`, { method: "DELETE" });
        toast.success("Payment deleted");
        list.reload();
      },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Payments</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">Track payments received against invoices.</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus /> Record payment
        </Button>
      </div>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search transaction ID or notes…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={[
            { value: "paymentDate", label: "Payment date" },
            { value: "amount", label: "Amount" },
            { value: "createdAt", label: "Date recorded" },
          ]}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[{ key: "method", label: "Method", options: paymentMethods }]}
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
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.paymentDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link href={`/finance/invoices/${item.invoice.id}`} className="font-medium text-heading hover:underline">
                      {item.invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{item.invoice.client?.name ?? "—"}</TableCell>
                  <TableCell>{item.invoice.project?.title ?? "—"}</TableCell>
                  <TableCell>{item.method.replace("_", " ")}</TableCell>
                  <TableCell>{formatMoney(item.amount, item.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} aria-label="Delete payment">
                      <Trash2 className="size-4 text-error-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(list.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState hasActiveFilters={list.hasActiveFilters} label="payments" />
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

      {showDialog && (
        <RecordPaymentDialog
          invoiceOptions={payableInvoices}
          onClose={() => setShowDialog(false)}
          onSuccess={() => {
            setShowDialog(false);
            list.reload();
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageInner />
    </Suspense>
  );
}
