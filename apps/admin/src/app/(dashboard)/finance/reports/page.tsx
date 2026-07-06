"use client";

import { FileBarChart } from "lucide-react";
import { Heading } from "@agency/ui";

export default function FinanceReportsPage() {
  return (
    <div>
      <Heading level={2}>Reports</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Detailed, exportable financial reports.</p>

      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 py-20 text-center">
        <FileBarChart className="size-10 text-neutral-300" />
        <p className="mt-4 text-body font-medium text-heading">Coming soon</p>
        <p className="mt-1 max-w-sm text-body-sm text-neutral-500">
          Filterable report types with PDF, Excel, and CSV export are planned as a follow-up. In the meantime, the Main Dashboard
          has revenue and invoice KPIs and charts.
        </p>
      </div>
    </div>
  );
}
