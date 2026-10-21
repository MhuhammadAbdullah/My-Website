"use client";

import * as React from "react";
import Link from "next/link";
import { Skeleton, cn } from "@agency/ui";
import { DEFAULT_CURRENCY } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { formatMoney } from "@/lib/currency";

interface Stats {
  pendingApplications: number;
  approvedInfluencers: number;
  bookingsThisMonth: number;
  pendingPayouts: number;
}

// Marketplace snapshot shown above every influencer screen.
export default function InfluencersLayout({ children }: { children: React.ReactNode }) {
  const { data, loading } = useAsyncData<Stats>(() => request<Stats>("/influencer-dashboard/admin/stats"), []);
  const tiles = [
    { label: "Pending applications", value: data?.pendingApplications ?? 0, href: "/influencers/applications", hot: (data?.pendingApplications ?? 0) > 0 },
    { label: "Approved influencers", value: data?.approvedInfluencers ?? 0, href: "/influencers" },
    { label: "Bookings this month", value: data?.bookingsThisMonth ?? 0, href: "/influencers/bookings" },
    { label: "Pending payouts", value: formatMoney(data?.pendingPayouts ?? 0, DEFAULT_CURRENCY, { maximumFractionDigits: 0 }), href: "/influencers/payouts" },
  ];
  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn("rounded-[10px] border px-4 py-3 transition-colors", t.hot ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-200 bg-neutral-50 text-heading hover:border-accent-500")}
          >
            <p className={cn("text-[12px] font-medium", t.hot ? "text-on-accent/70" : "text-neutral-500")}>{t.label}</p>
            {loading ? <Skeleton className="mt-2 h-6 w-16" /> : <p className="mt-1 font-heading text-[1.375rem] font-extrabold leading-none tracking-tight">{t.value}</p>}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
