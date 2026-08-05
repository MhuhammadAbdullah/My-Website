"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Textarea,
  toast,
} from "@agency/ui";
import { AdminListToolbar, EmptyState, ListSummary } from "@/components/admin-list-toolbar";
import { request } from "@/lib/api";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, type BookingStatusId } from "@agency/types";

interface BookingListItem {
  id: string;
  bookingNumber: string;
  status: BookingStatusId;
  businessName: string;
  grossAmount: string;
  netInfluencerEarning: string;
  createdAt: string;
  influencer: { name: string; profile: { username: string } | null };
}

interface RequiredDeliverable {
  deliverableTypeKey: string;
  label: string;
  price: number;
  currency: string;
}

interface StatusHistoryItem {
  id: string;
  fromStatus: BookingStatusId | null;
  toStatus: BookingStatusId;
  note: string | null;
  createdAt: string;
  changedBy: { name: string } | null;
  changedByInfluencer: { name: string } | null;
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  grandTotal: string;
  balance: string;
}

interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: BookingStatusId;
  businessName: string;
  businessWebsite: string | null;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  campaignObjective: string;
  industry: string;
  product: string;
  budget: string;
  campaignType: string;
  targetAudience: string;
  requiredDeliverables: RequiredDeliverable[];
  timeline: string;
  notes: string | null;
  grossAmount: string;
  commissionPercent: string;
  commissionAmount: string;
  platformFees: string;
  taxAmount: string;
  netInfluencerEarning: string;
  influencer: { id: string; name: string; email: string; profile: { username: string } | null };
  invoice: InvoiceSummary | null;
  attachments: { media: { url: string } }[];
  statusHistory: StatusHistoryItem[];
  allowedTransitions: BookingStatusId[];
}

const statusFilterOptions = BOOKING_STATUSES.map((s) => ({ value: s, label: BOOKING_STATUS_LABELS[s] }));
const sortOptions = [
  { value: "createdAt", label: "Date submitted" },
  { value: "bookingNumber", label: "Booking #" },
  { value: "status", label: "Status" },
  { value: "grossAmount", label: "Amount" },
];
const paymentMethods = ["CASH", "BANK_TRANSFER", "STRIPE", "PAYPAL", "WISE", "JAZZCASH", "EASYPAISA", "CUSTOM"];

function statusVariant(status: BookingStatusId): "success" | "error" | "warning" | "accent" | "neutral" {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED" || status === "DISPUTED" || status === "DECLINED_BY_INFLUENCER") return "error";
  if (status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "AWAITING_PAYMENT") return "warning";
  return "accent";
}

function formatMoney(value: string | number, currency = "") {
  const num = Number(value);
  return `${currency ? `${currency} ` : ""}${num.toLocaleString()}`;
}

function Info({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : undefined}>
      <dt className="text-label text-neutral-400">{label}</dt>
      <dd className="text-heading">{value}</dd>
    </div>
  );
}

function BookingsPageInner() {
  const list = usePaginatedList<BookingListItem>({
    endpoint: "/bookings/admin",
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    filterKeys: ["status"],
  });
  const [openId, setOpenId] = React.useState<string | null>(null);
  const rows = list.data ?? [];

  return (
    <div>
      <Heading level={2}>Bookings</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Review campaign booking requests, move them through the workflow, and record client payments.
      </p>

      <div className="mt-6">
        <AdminListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search booking #, business, contact…"
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          sortOptions={sortOptions}
          onSortChange={list.setSort}
          filters={list.filters}
          filterOptions={[{ key: "status", label: "Status", options: statusFilterOptions }]}
          onFilterChange={list.setFilter}
          limit={list.limit}
          onLimitChange={list.setLimit}
          hasActiveFilters={list.hasActiveFilters}
          onClearFilters={list.clearFilters}
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <Skeleton className="h-64 w-full" />
        ) : list.error ? (
          <p className="text-center text-body-sm text-error-500">{list.error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Influencer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-heading">{b.bookingNumber}</TableCell>
                  <TableCell>{b.businessName}</TableCell>
                  <TableCell>{b.influencer.profile ? `@${b.influencer.profile.username}` : b.influencer.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(b.status)}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                  </TableCell>
                  <TableCell>{Number(b.grossAmount) > 0 ? formatMoney(b.grossAmount) : "—"}</TableCell>
                  <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setOpenId(b.id)}>
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-neutral-400">
                    {list.hasActiveFilters ? <EmptyState hasActiveFilters label="bookings" /> : <Badge variant="neutral">No bookings yet</Badge>}
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

      {openId && <BookingManageDialog id={openId} onClose={() => setOpenId(null)} onChanged={() => list.reload()} />}
    </div>
  );
}

function BookingManageDialog({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [item, setItem] = React.useState<BookingDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [transitioning, setTransitioning] = React.useState(false);
  const [pendingTransition, setPendingTransition] = React.useState<BookingStatusId | null>(null);
  const [grossAmountInput, setGrossAmountInput] = React.useState("");
  const [platformFeesInput, setPlatformFeesInput] = React.useState("");
  const [taxAmountInput, setTaxAmountInput] = React.useState("");
  const [cancelReasonInput, setCancelReasonInput] = React.useState("");
  const [noteInput, setNoteInput] = React.useState("");
  const [showPayment, setShowPayment] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    request<{ item: BookingDetail }>(`/bookings/admin/${id}`)
      .then((r) => setItem(r.item))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load booking"))
      .finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function confirmTransition() {
    if (!pendingTransition) return;
    setTransitioning(true);
    try {
      await request(`/bookings/admin/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          toStatus: pendingTransition,
          note: noteInput || undefined,
          grossAmount: pendingTransition === "AWAITING_PAYMENT" && grossAmountInput ? Number(grossAmountInput) : undefined,
          platformFees: pendingTransition === "COMPLETED" && platformFeesInput ? Number(platformFeesInput) : undefined,
          taxAmount: pendingTransition === "COMPLETED" && taxAmountInput ? Number(taxAmountInput) : undefined,
          cancelReason: pendingTransition === "CANCELLED" ? cancelReasonInput || undefined : undefined,
        }),
      });
      toast.success(`Booking moved to ${BOOKING_STATUS_LABELS[pendingTransition]}`);
      setPendingTransition(null);
      setGrossAmountInput("");
      setPlatformFeesInput("");
      setTaxAmountInput("");
      setCancelReasonInput("");
      setNoteInput("");
      load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            {item?.bookingNumber ?? "Booking"}
            {item && <Badge variant={statusVariant(item.status)}>{BOOKING_STATUS_LABELS[item.status]}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {loading || !item ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <section>
                <h4 className="text-body-sm font-semibold text-heading">Client & campaign</h4>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
                  <Info label="Business" value={item.businessName} />
                  <Info label="Website" value={item.businessWebsite ?? "—"} />
                  <Info label="Contact" value={`${item.contactPerson} · ${item.contactEmail} · ${item.contactPhone}`} span2 />
                  <Info label="Industry" value={item.industry} />
                  <Info label="Product" value={item.product} />
                  <Info label="Campaign type" value={item.campaignType} />
                  <Info label="Budget" value={formatMoney(item.budget)} />
                  <Info label="Timeline" value={item.timeline} />
                  <Info label="Influencer" value={item.influencer.profile ? `@${item.influencer.profile.username}` : item.influencer.name} />
                  <Info label="Objective" value={item.campaignObjective} span2 />
                  <Info label="Target audience" value={item.targetAudience} span2 />
                  {item.notes && <Info label="Notes" value={item.notes} span2 />}
                </dl>
              </section>

              {item.requiredDeliverables.length > 0 && (
                <section>
                  <h4 className="text-body-sm font-semibold text-heading">Package</h4>
                  <ul className="mt-2 space-y-1">
                    {item.requiredDeliverables.map((d, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-body-sm">
                        <span>{d.label}</span>
                        <span className="font-medium text-heading">{d.price > 0 ? formatMoney(d.price, d.currency) : "To be quoted"}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {item.attachments.length > 0 && (
                <section>
                  <h4 className="text-body-sm font-semibold text-heading">Attachments</h4>
                  <ul className="mt-2 space-y-1">
                    {item.attachments.map((a, i) => (
                      <li key={i}>
                        <a href={a.media.url} target="_blank" rel="noreferrer" className="text-body-sm text-accent-600 hover:underline">
                          Attachment {i + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {item.invoice && (
                <section>
                  <h4 className="text-body-sm font-semibold text-heading">Invoice</h4>
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-body-sm">
                    <div>
                      <Link href={`/finance/invoices/${item.invoice.id}`} className="font-medium text-heading hover:underline">
                        {item.invoice.invoiceNumber}
                      </Link>
                      <p className="text-label text-neutral-400">{item.invoice.status}</p>
                    </div>
                    <div className="text-right">
                      <p>{formatMoney(item.invoice.grandTotal, item.invoice.currency)}</p>
                      <p className="text-label text-neutral-400">Balance: {formatMoney(item.invoice.balance, item.invoice.currency)}</p>
                    </div>
                  </div>
                  {Number(item.invoice.balance) > 0 && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowPayment(true)}>
                      Record payment
                    </Button>
                  )}
                </section>
              )}

              {Number(item.commissionAmount) > 0 && (
                <section>
                  <h4 className="text-body-sm font-semibold text-heading">Commission & earnings</h4>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm">
                    <Info label="Gross amount" value={formatMoney(item.grossAmount)} />
                    <Info label="Commission" value={`${item.commissionPercent}% (${formatMoney(item.commissionAmount)})`} />
                    <Info label="Platform fees" value={formatMoney(item.platformFees)} />
                    <Info label="Taxes" value={formatMoney(item.taxAmount)} />
                    <Info label="Net influencer earning" value={formatMoney(item.netInfluencerEarning)} span2 />
                  </dl>
                </section>
              )}

              <section>
                <h4 className="text-body-sm font-semibold text-heading">Status history</h4>
                <ul className="mt-2 space-y-2">
                  {item.statusHistory.map((h) => (
                    <li key={h.id} className="rounded-lg border border-neutral-200 px-3 py-2 text-body-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-heading">
                          {h.fromStatus ? `${BOOKING_STATUS_LABELS[h.fromStatus]} → ` : ""}
                          {BOOKING_STATUS_LABELS[h.toStatus]}
                        </span>
                        <span className="text-label text-neutral-400">{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                      {(h.changedBy || h.changedByInfluencer) && (
                        <p className="text-label text-neutral-400">by {h.changedBy?.name ?? h.changedByInfluencer?.name}</p>
                      )}
                      {h.note && <p className="mt-1 text-neutral-600">{h.note}</p>}
                    </li>
                  ))}
                </ul>
              </section>

              {item.allowedTransitions.length > 0 && (
                <section>
                  <h4 className="text-body-sm font-semibold text-heading">Move to</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.allowedTransitions.map((s) => (
                      <Button key={s} variant={pendingTransition === s ? "primary" : "outline"} size="sm" onClick={() => setPendingTransition(s)}>
                        {BOOKING_STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>

                  {pendingTransition && (
                    <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 p-4">
                      {pendingTransition === "AWAITING_PAYMENT" && (
                        <div>
                          <Label>Gross amount override (optional — defaults to selected deliverables total)</Label>
                          <Input type="number" min={0} value={grossAmountInput} onChange={(e) => setGrossAmountInput(e.target.value)} />
                        </div>
                      )}
                      {pendingTransition === "COMPLETED" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label>Platform fees (optional)</Label>
                            <Input type="number" min={0} value={platformFeesInput} onChange={(e) => setPlatformFeesInput(e.target.value)} />
                          </div>
                          <div>
                            <Label>Taxes (optional)</Label>
                            <Input type="number" min={0} value={taxAmountInput} onChange={(e) => setTaxAmountInput(e.target.value)} />
                          </div>
                        </div>
                      )}
                      {pendingTransition === "CANCELLED" && (
                        <div>
                          <Label>Cancellation reason</Label>
                          <Textarea value={cancelReasonInput} onChange={(e) => setCancelReasonInput(e.target.value)} rows={2} />
                        </div>
                      )}
                      <div>
                        <Label>Note (optional)</Label>
                        <Textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} rows={2} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPendingTransition(null)} disabled={transitioning}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={confirmTransition} disabled={transitioning}>
                          {transitioning ? "Saving…" : `Confirm — ${BOOKING_STATUS_LABELS[pendingTransition]}`}
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {showPayment && item?.invoice && (
        <RecordBookingPaymentDialog
          bookingId={id}
          invoice={item.invoice}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            load();
            onChanged();
          }}
        />
      )}
    </Dialog>
  );
}

function RecordBookingPaymentDialog({
  bookingId,
  invoice,
  onClose,
  onSuccess,
}: {
  bookingId: string;
  invoice: InvoiceSummary;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = React.useState(invoice.balance);
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = React.useState("BANK_TRANSFER");
  const [transactionId, setTransactionId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await request(`/bookings/admin/${bookingId}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: amountNum,
          currency: invoice.currency,
          paymentDate,
          method,
          transactionId: transactionId || null,
          notes: notes || null,
        }),
      });
      toast.success("Payment recorded");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex w-full max-w-md flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-5 py-4">
          <p className="text-body-sm text-neutral-500">
            Remaining balance: <span className="font-medium text-heading">{formatMoney(invoice.balance, invoice.currency)}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Amount</Label>
              <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Payment date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.charAt(0) + m.slice(1).toLowerCase().replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID (optional)</Label>
              <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsPageInner />
    </Suspense>
  );
}
