"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, Heading, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface ClientSummary {
  client: { id: string; name: string; email: string | null; company: string | null; currency: string };
  totalQuotations: number;
  totalInvoices: number;
  totalRevenue: number;
  totalPending: number;
  overdueInvoices: number;
  recentPayments: {
    id: string;
    amount: string;
    currency: string;
    paymentDate: string;
    method: string;
    invoice: { id: string; invoiceNumber: string };
  }[];
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function ClientFinanceProfilePage() {
  const params = useParams<{ id: string }>();
  const { data, loading } = useAsyncData<ClientSummary>(
    () => request<ClientSummary>(`/finance/clients/${params.id}/summary`),
    [params.id],
  );

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  const currency = data.client.currency;

  return (
    <div>
      <Link href="/finance/clients" className="flex items-center gap-1.5 text-body-sm text-neutral-500 hover:text-heading">
        <ArrowLeft className="size-4" /> Back to clients
      </Link>

      <div className="mt-3">
        <Heading level={2}>{data.client.name}</Heading>
        <p className="mt-1 text-body-sm text-neutral-500">
          {data.client.company ?? "—"} {data.client.email ? `· ${data.client.email}` : ""}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-body-sm text-neutral-500">Total quotations</p>
            <p className="mt-1 text-h3 font-semibold text-heading">{data.totalQuotations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-body-sm text-neutral-500">Total invoices</p>
            <p className="mt-1 text-h3 font-semibold text-heading">{data.totalInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-body-sm text-neutral-500">Overdue invoices</p>
            <p className="mt-1 text-h3 font-semibold text-error-600">{data.overdueInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-body-sm text-neutral-500">Total revenue (paid)</p>
            <p className="mt-1 text-h3 font-semibold text-success-600">{formatMoney(data.totalRevenue, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-body-sm text-neutral-500">Pending balance</p>
            <p className="mt-1 text-h3 font-semibold text-warning-600">{formatMoney(data.totalPending, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Heading level={3}>Payment history</Heading>
        {data.recentPayments.length === 0 ? (
          <p className="mt-2 text-body-sm text-neutral-500">No payments recorded yet.</p>
        ) : (
          <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Link href={`/finance/invoices/${p.invoice.id}`} className="font-medium text-heading hover:underline">
                        {p.invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{p.method.replace("_", " ")}</TableCell>
                    <TableCell>{formatMoney(Number(p.amount), p.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
