"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, Heading, Skeleton, Textarea, toast } from "@agency/ui";
import { BOOKING_STATUS_LABELS, type BookingStatusId } from "@agency/types";
import { acceptBooking, declineBooking, deliverBooking, getInfluencerBooking, requestBookingDetails } from "@/lib/influencer-api";
import type { BookingDetailRead } from "@/lib/influencer-types";

function statusVariant(status: string): "success" | "error" | "warning" | "accent" | "neutral" {
  if (status === "COMPLETED") return "success";
  if (status === "CANCELLED" || status === "DISPUTED" || status === "DECLINED_BY_INFLUENCER") return "error";
  if (status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "AWAITING_PAYMENT") return "warning";
  return "accent";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label text-neutral-400">{label}</dt>
      <dd className="text-body-sm text-heading">{value}</dd>
    </div>
  );
}

export default function InfluencerBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = React.useState<BookingDetailRead | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showDecline, setShowDecline] = React.useState(false);
  const [showRequestDetails, setShowRequestDetails] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState("");
  const [detailsMessage, setDetailsMessage] = React.useState("");
  const [acting, setActing] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    getInfluencerBooking(id)
      .then(setItem)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load booking"))
      .finally(() => setLoading(false));
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const canAccept = item?.allowedTransitions.includes("ACCEPTED_BY_INFLUENCER");
  const canDecline = item?.allowedTransitions.includes("DECLINED_BY_INFLUENCER");
  const canDeliver = item?.allowedTransitions.includes("DELIVERED");
  const canRequestDetails = item?.status === "INFLUENCER_NOTIFIED";

  async function handleAccept() {
    setActing(true);
    try {
      await acceptBooking(id);
      toast.success("Booking accepted");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  async function handleDecline() {
    if (declineReason.trim().length < 10) {
      toast.error("Please provide a reason (at least 10 characters).");
      return;
    }
    setActing(true);
    try {
      await declineBooking(id, declineReason.trim());
      toast.success("Booking declined");
      setShowDecline(false);
      setDeclineReason("");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  async function handleDeliver() {
    setActing(true);
    try {
      await deliverBooking(id);
      toast.success("Marked as delivered");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  async function handleRequestDetails() {
    if (detailsMessage.trim().length < 5) {
      toast.error("Please describe what you need clarified.");
      return;
    }
    setActing(true);
    try {
      await requestBookingDetails(id, detailsMessage.trim());
      toast.success("Request sent — our team will follow up.");
      setShowRequestDetails(false);
      setDetailsMessage("");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  if (loading || !item) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div>
      <button onClick={() => router.push("/influencer/dashboard/bookings")} className="text-body-sm text-neutral-500 hover:underline">
        ← Back to bookings
      </button>

      <div className="mt-3 flex items-center gap-3">
        <Heading level={2}>{item.businessName}</Heading>
        <Badge variant={statusVariant(item.status)}>{BOOKING_STATUS_LABELS[item.status as BookingStatusId] ?? item.status}</Badge>
      </div>
      <p className="mt-1 text-body-sm text-neutral-500">{item.bookingNumber}</p>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-neutral-200 p-6 sm:grid-cols-3">
        <Info label="Industry" value={item.industry} />
        <Info label="Product" value={item.product} />
        <Info label="Campaign type" value={item.campaignType} />
        <Info label="Budget" value={Number(item.budget).toLocaleString()} />
        <Info label="Timeline" value={item.timeline} />
        {item.netInfluencerEarning && <Info label="Your earning" value={Number(item.netInfluencerEarning).toLocaleString()} />}
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 p-6">
        <h3 className="text-body-sm font-semibold text-heading">Campaign objective</h3>
        <p className="mt-2 text-body-sm text-neutral-600">{item.campaignObjective}</p>
        <h3 className="mt-4 text-body-sm font-semibold text-heading">Target audience</h3>
        <p className="mt-2 text-body-sm text-neutral-600">{item.targetAudience}</p>
        {item.notes && (
          <>
            <h3 className="mt-4 text-body-sm font-semibold text-heading">Notes</h3>
            <p className="mt-2 text-body-sm text-neutral-600">{item.notes}</p>
          </>
        )}
      </div>

      {item.requiredDeliverables.length > 0 && (
        <div className="mt-6 rounded-2xl border border-neutral-200 p-6">
          <h3 className="text-body-sm font-semibold text-heading">Package</h3>
          <ul className="mt-2 space-y-1">
            {item.requiredDeliverables.map((d, i) => (
              <li key={i} className="flex justify-between text-body-sm">
                <span className="text-neutral-600">{d.label}</span>
                <span className="font-medium text-heading">{d.price > 0 ? `${d.currency} ${d.price.toLocaleString()}` : "To be quoted"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-neutral-200 p-6">
        <h3 className="text-body-sm font-semibold text-heading">Status history</h3>
        <ul className="mt-2 space-y-2">
          {item.statusHistory.map((h) => (
            <li key={h.id} className="text-body-sm">
              <span className="font-medium text-heading">
                {h.fromStatus ? `${BOOKING_STATUS_LABELS[h.fromStatus as BookingStatusId] ?? h.fromStatus} → ` : ""}
                {BOOKING_STATUS_LABELS[h.toStatus as BookingStatusId] ?? h.toStatus}
              </span>
              <span className="ml-2 text-label text-neutral-400">{new Date(h.createdAt).toLocaleString()}</span>
              {h.note && <p className="text-neutral-500">{h.note}</p>}
            </li>
          ))}
        </ul>
      </div>

      {(canAccept || canDecline || canDeliver || canRequestDetails) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {canAccept && (
            <Button onClick={handleAccept} disabled={acting}>
              Accept booking
            </Button>
          )}
          {canRequestDetails && (
            <Button variant="outline" onClick={() => setShowRequestDetails((s) => !s)} disabled={acting}>
              Request more details
            </Button>
          )}
          {canDecline && (
            <Button variant="outline" onClick={() => setShowDecline((s) => !s)} disabled={acting}>
              Reject
            </Button>
          )}
          {canDeliver && (
            <Button onClick={handleDeliver} disabled={acting}>
              Mark as delivered
            </Button>
          )}
        </div>
      )}

      {showRequestDetails && (
        <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 p-4">
          <Textarea
            placeholder="What would you like clarified about this booking?"
            value={detailsMessage}
            onChange={(e) => setDetailsMessage(e.target.value)}
            rows={2}
          />
          <Button variant="outline" onClick={handleRequestDetails} disabled={acting || detailsMessage.trim().length < 5}>
            Send request
          </Button>
        </div>
      )}

      {showDecline && (
        <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 p-4">
          <Textarea
            placeholder="Reason (required) — why can't you take this booking?"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={2}
          />
          <Button variant="outline" onClick={handleDecline} disabled={acting || declineReason.trim().length < 10}>
            Confirm rejection
          </Button>
        </div>
      )}
    </div>
  );
}
