"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, Skeleton } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface ProjectFinanceSummary {
  totalQuoted: number;
  totalInvoiced: number;
  totalReceived: number;
  totalOutstanding: number;
  quotationsCount: number;
  invoicesCount: number;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function ProjectFinanceDialog({ projectId, projectTitle, onClose }: { projectId: string; projectTitle: string; onClose: () => void }) {
  const { data, loading } = useAsyncData<ProjectFinanceSummary>(
    () => request<ProjectFinanceSummary>(`/finance/projects/${projectId}/summary`),
    [projectId],
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finance — {projectTitle}</DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-body-sm text-neutral-500">Total quoted</p>
              <p className="mt-1 text-h5 font-semibold text-heading">{formatMoney(data.totalQuoted)}</p>
              <p className="text-body-sm text-neutral-400">{data.quotationsCount} quotation(s)</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-body-sm text-neutral-500">Total invoiced</p>
              <p className="mt-1 text-h5 font-semibold text-heading">{formatMoney(data.totalInvoiced)}</p>
              <p className="text-body-sm text-neutral-400">{data.invoicesCount} invoice(s)</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-body-sm text-neutral-500">Total received</p>
              <p className="mt-1 text-h5 font-semibold text-success-600">{formatMoney(data.totalReceived)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-body-sm text-neutral-500">Outstanding</p>
              <p className="mt-1 text-h5 font-semibold text-warning-600">{formatMoney(data.totalOutstanding)}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
