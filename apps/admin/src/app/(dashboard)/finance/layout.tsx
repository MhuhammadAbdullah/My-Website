import { FinanceTabs } from "@/components/finance/finance-header";

// One switcher for every finance screen (Quotations, Invoices, Payments, Clients, Reports, Settings).
export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <FinanceTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
