"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  Receipt,
  UserCog,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { Badge, Heading, Skeleton } from "@agency/ui";
import { getInfluencerDashboardStats, getInfluencerMe } from "@/lib/influencer-api";
import type { InfluencerDashboardStats, InfluencerMeRead } from "@/lib/influencer-types";
import { DashboardCharts } from "@/components/influencer/dashboard-charts";
import { PlatformAnalyticsCard } from "@/components/influencer/platform-analytics-card";
import { formatCompactNumber, timeAgo } from "@/lib/influencer-format";

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  icon: typeof CalendarClock;
  loading: boolean;
  tone?: "accent" | "success" | "warning" | "error";
}) {
  const toneClasses = {
    accent: "bg-accent-50 text-accent-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    error: "bg-error-50 text-error-600",
  }[tone];

  return (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-neutral-500">{label}</p>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${toneClasses}`}>
          <Icon className="size-4.5" />
        </div>
      </div>
      {loading ? <Skeleton className="mt-3 h-7 w-20" /> : <p className="mt-2 text-h4 font-semibold text-heading">{value}</p>}
    </div>
  );
}

const ACTIVITY_ICON: Record<string, typeof CalendarClock> = {
  "booking.assigned": CalendarClock,
  "booking.completed": CheckCircle2,
  "payout.sent": Banknote,
  "badge.approved": Award,
  "application.approved": FileCheck,
  "application.rejected": XCircle,
  "application.needs_more_info": FileCheck,
  "profile.updated": UserCog,
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Heading level={3} className="mt-10">
      {children}
    </Heading>
  );
}

export default function InfluencerOverviewPage() {
  const [me, setMe] = React.useState<InfluencerMeRead | null>(null);
  const [stats, setStats] = React.useState<InfluencerDashboardStats | null>(null);

  React.useEffect(() => {
    getInfluencerMe().then(setMe);
    getInfluencerDashboardStats().then(setStats);
  }, []);

  const profile = me?.profile;
  const platforms = profile?.platforms ?? [];
  const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);
  const loading = !stats;

  return (
    <div>
      <Heading level={2}>Welcome back{me ? `, ${me.name}` : ""}</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Here's how your creator business is doing.</p>

      {profile && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant={profile.publicStatus === "PUBLISHED" ? "success" : "neutral"}>{profile.publicStatus}</Badge>
          <Badge variant={profile.availableForBooking ? "success" : "neutral"}>
            {profile.availableForBooking ? "Available for booking" : "Not available"}
          </Badge>
          <Link href={`/influencers/${profile.username}`} className="text-body-sm text-accent-600 hover:underline">
            View public profile →
          </Link>
        </div>
      )}

      <SectionHeading>Bookings</SectionHeading>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total bookings" value={stats?.bookings.total ?? 0} icon={CalendarClock} loading={loading} />
        <StatCard label="Pending bookings" value={stats?.bookings.pending ?? 0} icon={Clock} loading={loading} tone="warning" />
        <StatCard label="Completed bookings" value={stats?.bookings.completed ?? 0} icon={CheckCircle2} loading={loading} tone="success" />
        <StatCard label="Cancelled bookings" value={stats?.bookings.cancelled ?? 0} icon={XCircle} loading={loading} tone="error" />
      </div>

      <SectionHeading>Earnings</SectionHeading>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total earnings"
          value={(stats?.earnings.totalEarnings ?? 0).toLocaleString()}
          icon={DollarSign}
          loading={loading}
          tone="success"
        />
        <StatCard
          label="Pending earnings"
          value={(stats?.earnings.pendingEarnings ?? 0).toLocaleString()}
          icon={Clock}
          loading={loading}
          tone="warning"
        />
        <StatCard
          label="Available balance"
          value={(stats?.earnings.availableBalance ?? 0).toLocaleString()}
          icon={Wallet}
          loading={loading}
        />
        <StatCard
          label="Lifetime earnings"
          value={(stats?.earnings.lifetimeEarnings ?? 0).toLocaleString()}
          icon={DollarSign}
          loading={loading}
          tone="success"
        />
      </div>

      <SectionHeading>Payouts &amp; invoices</SectionHeading>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total payouts" value={stats?.payouts.total ?? 0} icon={Banknote} loading={loading} />
        <StatCard label="Pending payouts" value={stats?.payouts.pending ?? 0} icon={Clock} loading={loading} tone="warning" />
        <StatCard label="Total invoices" value={stats?.totalInvoices ?? 0} icon={Receipt} loading={loading} />
      </div>

      <SectionHeading>Platform overview</SectionHeading>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Connected platforms" value={platforms.length} icon={Users} loading={!me} />
        <StatCard label="Combined followers" value={formatCompactNumber(totalFollowers)} icon={Users} loading={!me} />
      </div>
      <div className="mt-4">
        {!me ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : platforms.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">
            Connect a platform on your profile to see stats here.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((p) => (
              <PlatformAnalyticsCard key={p.id} platform={p} />
            ))}
          </div>
        )}
      </div>

      <SectionHeading>Analytics</SectionHeading>
      <div className="mt-4">
        <DashboardCharts data={stats} loading={loading} platforms={platforms} />
      </div>

      <SectionHeading>Recent activity</SectionHeading>
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : !stats || stats.recentActivity.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">No activity yet.</div>
        ) : (
          <ol className="space-y-0">
            {stats.recentActivity.map((item, i) => {
              const Icon = ACTIVITY_ICON[item.type] ?? CalendarClock;
              const content = (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                      <Icon className="size-4" />
                    </div>
                    {i < stats.recentActivity.length - 1 && <div className="mt-1 w-px flex-1 bg-neutral-200" />}
                  </div>
                  <div className="pb-6">
                    <p className="text-body-sm font-medium text-heading">{item.title}</p>
                    <p className="mt-0.5 text-body-sm text-neutral-500">{item.body}</p>
                    <p className="mt-1 text-label text-neutral-400">{timeAgo(item.createdAt)}</p>
                  </div>
                </div>
              );
              return (
                <li key={`${item.type}-${item.createdAt}-${i}`}>
                  {item.linkUrl ? (
                    <Link href={item.linkUrl} className="block hover:opacity-80">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
