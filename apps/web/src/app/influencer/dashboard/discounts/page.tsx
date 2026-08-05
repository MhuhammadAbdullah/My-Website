"use client";

import * as React from "react";
import { Badge, Button, Heading, Pagination, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@agency/ui";
import { getInfluencerDiscounts, respondToInfluencerDiscount } from "@/lib/influencer-api";
import type { InfluencerDiscountRead } from "@/lib/influencer-types";

function statusVariant(status: InfluencerDiscountRead["status"]): "success" | "error" | "warning" {
  if (status === "APPROVED") return "success";
  if (status === "DECLINED") return "error";
  return "warning";
}

function statusLabel(status: InfluencerDiscountRead["status"]): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function InfluencerDiscountsPage() {
  const [items, setItems] = React.useState<InfluencerDiscountRead[] | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [respondingId, setRespondingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    return getInfluencerDiscounts({ page }).then((r) => {
      setItems(r.items);
      setTotalPages(r.totalPages);
    });
  }, [page]);

  React.useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load discounts"));
  }, [load]);

  async function handleRespond(d: InfluencerDiscountRead, decision: "APPROVED" | "DECLINED") {
    setRespondingId(d.id);
    try {
      await respondToInfluencerDiscount(d.id, decision);
      if (decision === "APPROVED") {
        toast.success("Discount approved — it'll now show on your cards");
      } else if (d.status === "APPROVED") {
        toast.success("Approval withdrawn — it no longer shows on your cards");
      } else {
        toast.success("Discount declined");
      }
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div>
      <Heading level={2}>Discounts</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Discounts admin proposes for you. Approve one to show its discounted price on your marketplace card and pricing cards; decline it if
        you don't want it running.
      </p>

      <div className="mt-8">
        {!items ? (
          <Skeleton className="h-64 w-full" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">
            No discounts have been proposed for you yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-heading">{d.discount.label}</TableCell>
                  <TableCell>
                    {d.discount.type === "PERCENT" ? `${Number(d.discount.value)}%` : Number(d.discount.value).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(d.status)}>{statusLabel(d.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {d.status === "PENDING" && (
                        <>
                          <Button variant="outline" size="sm" disabled={respondingId === d.id} onClick={() => handleRespond(d, "DECLINED")}>
                            Decline
                          </Button>
                          <Button size="sm" disabled={respondingId === d.id} onClick={() => handleRespond(d, "APPROVED")}>
                            Approve
                          </Button>
                        </>
                      )}
                      {d.status === "APPROVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-error-500"
                          disabled={respondingId === d.id}
                          onClick={() => handleRespond(d, "DECLINED")}
                        >
                          Withdraw
                        </Button>
                      )}
                      {d.status === "DECLINED" && (
                        <Button size="sm" disabled={respondingId === d.id} onClick={() => handleRespond(d, "APPROVED")}>
                          Approve
                        </Button>
                      )}
                    </div>
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
