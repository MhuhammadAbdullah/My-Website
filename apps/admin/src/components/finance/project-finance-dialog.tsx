"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, Skeleton } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { formatMoney } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@agency/types";

interface ProjectFinanceSummary {
  totalQuoted: number;
  totalInvoiced: number;
  totalReceived: number;
  totalOutstanding: number;
  quotationsCount: number;
  invoicesCount: number;
  defaultCurrency: string;
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-body-sm text-neutral-500">Total quoted</p>
              <p className="mt-1 text-h5 font-semibold text-heading">
                {formatMoney(data.totalQuoted, data.defaultCurrency ?? DEFAULT_CURRENCY, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-body-sm text-neutral-400">{data.quotationsCount} quotation(s)</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-body-sm text-neutral-500">Total invoiced</p>
              <p className="mt-1 text-h5 font-semibold text-heading">
                {formatMoney(data.totalInvoiced, data.defaultCurrency ?? DEFAULT_CURRENCY, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-body-sm text-neutral-400">{data.invoicesCount} invoice(s)</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-body-sm text-neutral-500">Total received</p>
              <p className="mt-1 text-h5 font-semibold text-success-600">
                {formatMoney(data.totalReceived, data.defaultCurrency ?? DEFAULT_CURRENCY, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-body-sm text-neutral-500">Outstanding</p>
              <p className="mt-1 text-h5 font-semibold text-warning-600">
                {formatMoney(data.totalOutstanding, data.defaultCurrency ?? DEFAULT_CURRENCY, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
