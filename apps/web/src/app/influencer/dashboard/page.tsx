"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Banknote,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  FileCheck,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { Skeleton, cn } from "@agency/ui";
import { getInfluencerDashboardStats, getInfluencerMe } from "@/lib/influencer-api";
import type { InfluencerDashboardStats, InfluencerMeRead } from "@/lib/influencer-types";
import { DashboardCharts } from "@/components/influencer/dashboard-charts";
import { PlatformAnalyticsCard } from "@/components/influencer/platform-analytics-card";
import { formatCompactNumber, timeAgo } from "@/lib/influencer-format";
import { AnimatedNumber } from "@/components/influencer/animated-number";

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

const card = "rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50";

function Tile({ label, value, note, href, loading, hot, delay = 0 }: { label: string; value: React.ReactNode; note?: string; href: string; loading: boolean; hot?: boolean; delay?: number }) {
  return (
    <Link
      href={href}
      style={{ ["--d" as string]: `${delay}s` }}
      className={cn("fade-up group block rounded-[var(--radius-xl)] border p-5 transition-colors", hot ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-200 bg-neutral-50 text-heading hover:border-accent-500")}
    >
      <p className={cn("text-body-sm font-medium", hot ? "text-on-accent/70" : "text-neutral-500")}>{label}</p>
      {loading ? <Skeleton className="mt-3 h-9 w-24" /> : <p className="mt-2 font-heading text-[clamp(2.25rem,1.6rem+2.2vw,3.75rem)] font-extrabold leading-none tracking-tight">{typeof value === "string" || typeof value === "number" ? <AnimatedNumber value={String(value)} /> : value}</p>}
      <p className={cn("mt-3 inline-flex items-center gap-1 text-label font-semibold", hot ? "text-on-accent/80" : "text-neutral-500 group-hover:text-accent-500")}>
        {note} <ArrowRight className="size-3" aria-hidden />
      </p>
    </Link>
  );
}

export default function InfluencerOverviewPage() {
  const [me, setMe] = React.useState<InfluencerMeRead | null>(null);
  const [stats, setStats] = React.useState<InfluencerDashboardStats | null>(null);

  React.useEffect(() => {
    getInfluencerMe().then(setMe);
    getInfluencerDashboardStats().then(setStats);
  }, []);

  const [barReady, setBarReady] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setBarReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  const profile = me?.profile;
  const platforms = profile?.platforms ?? [];
  const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);
  const loading = !stats;
  const firstName = me?.name.split(" ")[0] ?? "";

  // What a new creator still needs to do, each linking straight to the right page.
  const steps = profile
    ? [
        { label: "Add a profile photo", done: !!profile.profilePhoto, href: "/influencer/dashboard/profile" },
        { label: "Write your tagline and bio", done: !!profile.tagline?.trim() && !!profile.bio?.trim(), href: "/influencer/dashboard/profile" },
        { label: "Pick your categories", done: profile.categories.length > 0, href: "/influencer/dashboard/profile" },
        { label: "Connect a social platform", done: platforms.length > 0, href: "/influencer/dashboard/profile" },
        { label: "Set your prices", done: profile.pricingItems.length + profile.pricingCards.length > 0, href: "/influencer/dashboard/pricing" },
        { label: "Add portfolio work", done: profile.portfolioItems.length > 0, href: "/influencer/dashboard/portfolio" },
        { label: "Choose how you get paid", done: !!profile.preferredPayoutMethod, href: "/influencer/dashboard/earnings" },
        { label: "Publish your profile", done: profile.publicStatus === "PUBLISHED", href: "/influencer/dashboard/profile" },
      ]
    : [];
  const doneCount = steps.filter((s) => s.done).length;
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1180px] space-y-8 pb-6">
      {/* ------------------------------------------------------------ welcome */}
      <section className="fade-up">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Creator dashboard</p>
        <h1 className="mt-2 font-heading font-extrabold tracking-tight text-heading" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.5rem)", lineHeight: 0.98 }}>
          Welcome back{firstName ? <>, <span className="text-accent-500">{firstName}.</span></> : "."}
        </h1>
        <p className="mt-3 text-body-sm text-neutral-500">Here is how your creator business is doing, and what to do next.</p>

        {profile && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-label font-bold uppercase tracking-wider", profile.publicStatus === "PUBLISHED" ? "bg-accent-500/15 text-accent-500" : "bg-neutral-200 text-neutral-600")}>
              {profile.publicStatus === "PUBLISHED" ? "Profile live" : profile.publicStatus === "DRAFT" ? "Draft: not public yet" : "Archived"}
            </span>
            <span className={cn("rounded-full px-3 py-1 text-label font-bold uppercase tracking-wider", profile.availableForBooking ? "bg-accent-500/15 text-accent-500" : "bg-neutral-200 text-neutral-600")}>
              {profile.availableForBooking ? "Taking bookings" : "Not taking bookings"}
            </span>
            <Link href={`/influencers/${profile.username}`} className="ml-1 inline-flex items-center gap-1.5 text-body-sm font-bold text-accent-500 hover:underline">
              <Eye className="size-4" aria-hidden /> View my public profile
            </Link>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ key numbers */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile delay={0.05} label="Bookings waiting for you" value={stats?.bookings.pending ?? 0} note="Open bookings" href="/influencer/dashboard/bookings" loading={loading} hot={(stats?.bookings.pending ?? 0) > 0} />
        <Tile delay={0.12} label="Available balance" value={(stats?.earnings.availableBalance ?? 0).toLocaleString()} note="See earnings" href="/influencer/dashboard/earnings" loading={loading} />
        <Tile delay={0.19} label="Total earnings" value={(stats?.earnings.totalEarnings ?? 0).toLocaleString()} note={`Pending: ${(stats?.earnings.pendingEarnings ?? 0).toLocaleString()}`} href="/influencer/dashboard/earnings" loading={loading} />
        <Tile delay={0.26} label="Combined followers" value={formatCompactNumber(totalFollowers)} note={`${platforms.length} platform${platforms.length === 1 ? "" : "s"}`} href="/influencer/dashboard/analytics" loading={!me} />
      </section>

      {/* ------------------------------------------------------------ setup checklist */}
      {profile && doneCount < steps.length && (
        <section className={cn(card, "fade-up p-5 sm:p-6")} style={{ ["--d" as string]: "0.3s" }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-[1.25rem] font-extrabold tracking-tight text-heading">Finish setting up your profile</h2>
              <p className="mt-1 text-body-sm text-neutral-500">A complete profile gets more booking requests. {doneCount} of {steps.length} steps done.</p>
            </div>
            <span className="font-heading text-[1.75rem] font-extrabold text-accent-500"><AnimatedNumber value={`${percent}%`} /></span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-accent-500 transition-[width] duration-1000 ease-out" style={{ width: `${barReady ? percent : 0}%` }} />
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className={cn("flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-body-sm transition-colors hover:border-accent-500", s.done ? "border-neutral-200 text-neutral-500" : "border-neutral-300 font-semibold text-heading")}>
                  {s.done ? <Check className="size-4 shrink-0 text-accent-500" aria-hidden /> : <Circle className="size-4 shrink-0 text-neutral-400" aria-hidden />}
                  <span className={cn("flex-1", s.done && "line-through")}>{s.label}</span>
                  {!s.done && <ArrowRight className="size-4 text-neutral-400" aria-hidden />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------ charts + activity */}
      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <h2 className="mb-3 font-heading text-[1.25rem] font-extrabold tracking-tight text-heading">Your numbers over time</h2>
          <DashboardCharts data={stats} loading={loading} platforms={platforms} />
        </div>

        {/* Same top edge as the chart cards: they sit under the "Your numbers over time" heading. */}
        <div className={cn(card, "fade-up p-5 xl:mt-[2.05rem]")} style={{ ["--d" as string]: "0.35s" }}>
          <h2 className="font-heading text-[1.125rem] font-extrabold tracking-tight text-heading">Recent activity</h2>
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : !stats || stats.recentActivity.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-neutral-300 p-6 text-center text-body-sm text-neutral-500">Nothing yet. New bookings, payouts and profile updates show up here.</p>
            ) : (
              <ol>
                {stats.recentActivity.slice(0, 8).map((item, i, arr) => {
                  const Icon = ACTIVITY_ICON[item.type] ?? CalendarClock;
                  const row = (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-accent-500">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        {i < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
                      </div>
                      <div className="min-w-0 pb-5">
                        <p className="text-body-sm font-semibold text-heading">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-body-sm text-neutral-500">{item.body}</p>
                        <p className="mt-1 text-label text-neutral-400">{timeAgo(item.createdAt)}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={`${item.type}-${item.createdAt}-${i}`}>
                      {item.linkUrl ? (
                        <Link href={item.linkUrl} className="block hover:opacity-80">
                          {row}
                        </Link>
                      ) : (
                        row
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ platforms */}
      <section className="fade-up" style={{ ["--d" as string]: "0.2s" }}>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-heading text-[1.75rem] font-extrabold tracking-tight text-heading">Your platforms</h2>
          <Link href="/influencer/dashboard/profile" className="text-body-sm font-bold text-accent-500 hover:underline">
            Manage platforms →
          </Link>
        </div>
        {!me ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : platforms.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-dashed border-neutral-300 p-8 text-center">
            <Users className="mx-auto size-8 text-neutral-400" aria-hidden />
            <p className="mt-3 text-body-sm text-neutral-500">Connect Instagram, YouTube, TikTok or any other platform so brands can see your reach.</p>
            <Link href="/influencer/dashboard/profile" className="mt-4 inline-flex rounded-full bg-accent-500 px-5 py-2.5 text-body-sm font-bold text-on-accent hover:opacity-90">
              Connect a platform
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((p) => (
              <PlatformAnalyticsCard key={p.id} platform={p} />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ all numbers */}
      <section className={cn(card, "fade-up p-5 sm:p-6")} style={{ ["--d" as string]: "0.2s" }}>
        <h2 className="font-heading text-[1.125rem] font-extrabold tracking-tight text-heading">All the numbers</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {[
            ["Total bookings", stats?.bookings.total],
            ["Completed", stats?.bookings.completed],
            ["Cancelled", stats?.bookings.cancelled],
            ["Invoices", stats?.totalInvoices],
            ["Lifetime earnings", stats?.earnings.lifetimeEarnings?.toLocaleString()],
            ["Pending earnings", stats?.earnings.pendingEarnings?.toLocaleString()],
            ["Payouts", stats?.payouts.total],
            ["Pending payouts", stats?.payouts.pending],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-label text-neutral-500">{k}</dt>
              <dd className="mt-1 font-heading text-[1.875rem] font-extrabold leading-none tracking-tight text-heading">{loading ? "…" : <AnimatedNumber value={String(v ?? 0)} />}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
