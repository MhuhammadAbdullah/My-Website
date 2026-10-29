"use client";

import * as React from "react";
import { ArrowRight, Check, ImagePlus, Quote, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, FieldError, Input, Label, SocialIcon, Textarea, cn, toast } from "@agency/ui";
import type { InfluencerPlatformRead } from "@/lib/influencer-types";
import { countText, formatCompactNumber, formatEngagementRate, platformIconId, platformLabel } from "@/lib/influencer-format";
import { AGE_GROUP_ORDER } from "./audience-insights";
import { BookingForm } from "./booking-form";
import { signReviewLogoUpload, submitReview, submitServiceReview, uploadRawFileToCloudinary, type UploadedRawMedia } from "@/lib/influencer-api";
import type { InfluencerPricingCardRead, InfluencerReviewRead } from "@/lib/influencer-types";

const card = "rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-5";
const cardTitle = "text-label font-semibold uppercase tracking-wider text-neutral-500";

export interface AnalyticsLabels {
  followersEngagement: string;
  engagementRate: string;
  reach: string;
  accountReach: string;
  contentReach: string;
  gender: string;
  female: string;
  male: string;
  age: string;
  topLocations: string;
  country: string;
  city: string;
  source: string;
}

// true once the element has scrolled into view (immediately when motion is reduced) -- drives the grow-in animations
function useReady<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(() => setReady(true));
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, ready] as const;
}

// "12K" / "16.7%" / "18.3K": counts the number up when it scrolls into view, keeping prefix/suffix and colour.
export function Counter({ value }: { value: string }) {
  const match = value.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  const [ref, ready] = useReady<HTMLSpanElement>();
  const [shown, setShown] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!ready || !match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseFloat(match[2]!.replace(/,/g, ""));
    const decimals = match[2]!.includes(".") ? match[2]!.split(".")[1]!.length : 0;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1300);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown((target * eased).toFixed(decimals));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, value]);
  if (!match) return <span>{value}</span>;
  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden>
        {match[1]}
        {shown ?? match[2]}
        {match[3]}
      </span>
    </span>
  );
}

function Bar({ pct, className, ready = true, delay = 0 }: { pct: number; className?: string; ready?: boolean; delay?: number }) {
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    if (!ready) return setW(0);
    const id = requestAnimationFrame(() => setW(Math.max(0, Math.min(100, pct))));
    return () => cancelAnimationFrame(id);
  }, [ready, pct]);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-neutral-200", className)}>
      <div
        className="h-full rounded-full bg-accent-500 transition-[width] duration-[1100ms] ease-out motion-reduce:transition-none"
        style={{ width: `${w}%`, transitionDelay: `${delay}ms` }}
      />
    </div>
  );
}

// card that fades up once the panel is in view
const reveal = (ready: boolean, i: number) => ({
  className: cn("transition-all duration-700 ease-out", ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"),
  style: { transitionDelay: `${i * 90}ms` },
});

function Locations({ countries, cities, labels, ready }: { countries: { name: string; value: number }[]; cities: { name: string; value: number }[]; labels: AnalyticsLabels; ready: boolean }) {
  const [tab, setTab] = React.useState<"country" | "city">(countries.length > 0 || cities.length === 0 ? "country" : "city");
  const rows = (tab === "country" ? countries : cities).slice(0, 6);
  if (countries.length === 0 && cities.length === 0) return null;
  return (
    <div className={cn(card, "mt-4", reveal(ready, 4).className)} style={reveal(ready, 4).style}>
      <div className="flex items-center justify-between gap-3">
        <p className={cardTitle}>{labels.topLocations}</p>
        <div className="inline-flex rounded-full border border-neutral-200 bg-background p-0.5">
          {(["country", "city"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              disabled={(t === "country" ? countries : cities).length === 0}
              className={cn("rounded-full px-3 py-1 text-label font-semibold disabled:opacity-40", tab === t ? "bg-accent-500 text-on-accent" : "text-heading")}
            >
              {labels[t]}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <li key={tab + r.name} style={{ ["--d" as string]: `${i * 0.07}s` }} className="fade-up grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-3 text-body-sm sm:grid-cols-[9rem_1fr_3rem]">
            <span className="truncate text-heading">{r.name}</span>
            <Bar pct={r.value} className="h-2.5" ready={ready} delay={150 + i * 100} />
            <span className="text-right font-semibold text-heading">
              <Counter value={`${r.value.toFixed(0)}%`} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Panel({ platform: p, labels }: { platform: InfluencerPlatformRead; labels: AnalyticsLabels }) {
  const insight = p.audienceInsight;
  const female = insight ? Number(insight.genderFemalePercent) : 0;
  const male = insight ? Number(insight.genderMalePercent) : 0;
  const ages = insight
    ? Object.entries(insight.ageGroups)
        .map(([g, v]) => [g, Number(v)] as const)
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => AGE_GROUP_ORDER.indexOf(a) - AGE_GROUP_ORDER.indexOf(b))
    : [];
  const maxAge = Math.max(0, ...ages.map(([, v]) => v));
  const countries = p.audienceLocations.filter((l) => l.level === "COUNTRY").map((l) => ({ name: l.name, value: Number(l.percentage) }));
  const cities = p.audienceLocations.filter((l) => l.level === "CITY").map((l) => ({ name: l.name, value: Number(l.percentage) }));
  const reachMax = Math.max(p.accountReach, p.avgReach, 1);
  const eng = Number(p.engagementRate);

  const [ref, ready] = useReady<HTMLDivElement>();
  return (
    <div ref={ref}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={cn(card, reveal(ready, 0).className)} style={reveal(ready, 0).style}>
          <p className={cardTitle}>{labels.followersEngagement}</p>
          <p className="mt-4 font-heading font-extrabold leading-none text-heading" style={{ fontSize: "clamp(2.25rem, 1.5rem + 2vw, 3.5rem)" }}>
            <Counter value={formatCompactNumber(p.followers)} />
          </p>
          <Bar pct={eng * 10} className="mt-5" ready={ready} delay={300} />
          <p className="mt-3 flex items-center justify-between text-label text-neutral-500">
            <span>{labels.engagementRate}</span>
            <span className="font-semibold text-accent-500">{formatEngagementRate(p.engagementRate)}</span>
          </p>
        </div>

        <div className={cn(card, reveal(ready, 1).className)} style={reveal(ready, 1).style}>
          <p className={cardTitle}>{labels.reach}</p>
          <div className="mt-4 space-y-4">
            {[
              [labels.accountReach, p.accountReach],
              [labels.contentReach, p.avgReach],
            ].map(([name, value], idx) => (
              <div key={name as string}>
                <p className="flex items-center justify-between text-body-sm">
                  <span className="text-neutral-500">{name}</span>
                  <span className="font-semibold text-heading">~{formatCompactNumber(value as number)}</span>
                </p>
                <Bar pct={((value as number) / reachMax) * 100} className="mt-2" ready={ready} delay={400 + idx * 150} />
              </div>
            ))}
          </div>
        </div>

        <div className={cn(card, reveal(ready, 2).className)} style={reveal(ready, 2).style}>
          <p className={cardTitle}>{labels.gender}</p>
          {insight && female + male > 0 ? (
            <>
              <div className="mt-4 flex h-9 overflow-hidden rounded-lg bg-neutral-200">
                <div className="bg-accent-500 transition-[width] duration-[1100ms] ease-out" style={{ width: ready ? `${(female / (female + male)) * 100}%` : "0%", transitionDelay: "500ms" }} />
                <div className="bg-[var(--color-neutral-900)] opacity-80 transition-[width] duration-[1100ms] ease-out" style={{ width: ready ? `${(male / (female + male)) * 100}%` : "0%", transitionDelay: "500ms" }} />
              </div>
              <div className="mt-4 flex justify-between gap-3">
                <div>
                  <p className="font-heading text-h4 font-extrabold text-accent-500">{female.toFixed(0)}%</p>
                  <p className="text-label text-neutral-500">{labels.female}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-h4 font-extrabold text-heading">{male.toFixed(0)}%</p>
                  <p className="text-label text-neutral-500">{labels.male}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-6 text-body-sm text-neutral-500">—</p>
          )}
        </div>

        <div className={cn(card, reveal(ready, 3).className)} style={reveal(ready, 3).style}>
          <p className={cardTitle}>{labels.age}</p>
          {ages.length > 0 ? (
            <div className="mt-3 flex h-28 items-end gap-2">
              {ages.map(([g, v], i) => (
                <div key={g} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[0.65rem] font-semibold text-heading">{v.toFixed(0)}%</span>
                  <div className={cn("w-full rounded-md transition-[height] duration-[900ms] ease-out", v === maxAge ? "bg-accent-500" : "bg-neutral-300")} style={{ height: ready ? `${Math.max(8, (v / maxAge) * 64)}px` : "4px", transitionDelay: `${500 + i * 120}ms` }} />
                  <span className="text-[0.6rem] text-neutral-500">{g}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-body-sm text-neutral-500">—</p>
          )}
        </div>
      </div>

      <Locations countries={countries} cities={cities} labels={labels} ready={ready} />
    </div>
  );
}

export function ProfileAnalytics({ platforms, labels, heading }: { platforms: InfluencerPlatformRead[]; labels: AnalyticsLabels; heading: string }) {
  const [active, setActive] = React.useState(platforms[0]?.id ?? "");
  const current = platforms.find((p) => p.id === active) ?? platforms[0];
  const [headRef, headReady] = useReady<HTMLDivElement>();
  if (!current) return null;
  return (
    <div>
      <div ref={headRef} className={cn("mb-8 flex flex-wrap items-center justify-between gap-4", reveal(headReady, 0).className)}>
        <h2 className="font-heading font-extrabold leading-none text-heading" style={{ fontSize: "clamp(1.75rem, 1rem + 2.6vw, 3.75rem)" }}>
          {heading}
        </h2>
        {platforms.length > 1 && (
          <div role="tablist" className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 p-1">
            {platforms.map((p) => {
              const icon = platformIconId(p.platform);
              return (
                <button key={p.id} type="button" role="tab" aria-selected={active === p.id} onClick={() => setActive(p.id)} className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-body-sm font-semibold", active === p.id ? "bg-accent-500 text-on-accent" : "text-heading")}>
                  {icon ? <SocialIcon platform={icon} className="size-4" /> : null}
                  {platformLabel(p.platform)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Panel key={current.id} platform={current} labels={labels} />
      {labels.source && <p className="mt-4 text-label text-neutral-500">{labels.source}</p>}
    </div>
  );
}

// ----------------------------------------------------------------------------------------- rate card

export interface RateRow {
  id: string;
  title: string;
  sub: string;
  price: string;
  struck?: string;
  cardId?: string;
}

export function RateCard({
  rows,
  cards,
  username,
  name,
  labels,
  booking,
}: {
  rows: RateRow[];
  cards: InfluencerPricingCardRead[];
  username: string;
  name: string;
  labels: { yourBooking: string; items: string; quoteNote: string; bookButton: string };
  booking: { state: "open" | "disabled" | "unavailable"; message: string };
}) {
  const [picked, setPicked] = React.useState<string[]>(rows[0] ? [rows[0].id] : []);
  const [open, setOpen] = React.useState(false);
  const selected = rows.filter((r) => picked.includes(r.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const firstCard = selected.find((r) => r.cardId)?.cardId ?? "";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
      <ul className="space-y-3">
        {rows.map((r) => {
          const on = picked.includes(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(r.id)}
                className={cn("flex w-full items-center gap-4 rounded-[var(--radius-lg)] border p-4 text-left transition-colors sm:p-5", on ? "border-accent-500 bg-neutral-50" : "border-neutral-200 hover:border-accent-500")}
              >
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border", on ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-300")}>{on && <Check className="size-4" aria-hidden />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-heading">{r.title}</span>
                  {r.sub && <span className="mt-0.5 block text-label text-neutral-500">{r.sub}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-heading text-body-lg font-extrabold text-heading">{r.price}</span>
                  {r.struck && <span className="block text-label text-neutral-500 line-through">{r.struck}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <aside className="rounded-[var(--radius-xl)] bg-accent-500 p-6 text-[#0b0b0c] lg:sticky lg:top-28">
        <p className="text-label font-bold uppercase tracking-wider">{labels.yourBooking}</p>
        <p className="mt-4 font-heading font-extrabold leading-none" style={{ fontSize: "clamp(2rem, 1.4rem + 2vw, 3.25rem)" }}>
          {labels.items.replace("{n}", String(selected.length))}
        </p>
        <p className="mt-2 min-h-5 text-body-sm">{selected.map((r) => r.title).join(", ")}</p>
        <div className="mt-5 border-t border-[#0b0b0c]/20 pt-4">
          {labels.quoteNote && <p className="text-label">{labels.quoteNote}</p>}
        </div>
        {booking.state === "open" ? (
          <button type="button" onClick={() => setOpen(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0c] px-6 py-3 text-body-sm font-bold text-[#f2f2ee] hover:opacity-90">
            {labels.bookButton.replace("{name}", name)} <ArrowRight className="size-4" aria-hidden />
          </button>
        ) : (
          <p className="mt-5 rounded-lg bg-[#0b0b0c]/10 p-3 text-body-sm font-medium">{booking.message}</p>
        )}
      </aside>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book {name}</DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-neutral-600">Tell us about your campaign and our team will follow up with next steps.</p>
          <div className="mt-6">
            <BookingForm
              username={username}
              pricingCards={cards}
              bare
              initial={{ pricingCardId: firstCard, notes: selected.length > 0 ? `Selected: ${selected.map((r) => r.title).join(", ")}` : "" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------------------- reviews

export interface ReviewLabels {
  logo?: string;
  heading: string;
  empty: string;
  reviewsCount: string;
  write: string;
  formTitle: string;
  formIntro: string;
  yourRating: string;
  yourName: string;
  yourCompany: string;
  yourReview: string;
  submit: string;
  thanks: string;
  showMore: string;
}

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn(size, i < value ? "fill-[#f5b301] text-[#f5b301]" : "text-neutral-300")} aria-hidden />
      ))}
    </span>
  );
}

export type ReviewTarget = { kind: "influencer"; username: string } | { kind: "service" };

function ReviewDialog({ open, onOpenChange, target, name, labels, onSent }: { open: boolean; onOpenChange: (v: boolean) => void; target: ReviewTarget; name: string; labels: ReviewLabels; onSent: (r: InfluencerReviewRead) => void }) {
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [authorName, setAuthorName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [website, setWebsite] = React.useState(""); // honeypot
  const [logo, setLogo] = React.useState<UploadedRawMedia | null>(null);
  const [logoBusy, setLogoBusy] = React.useState(false);
  const logoInput = React.useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    setLogoError("");
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return setLogoError("Please choose a PNG, JPG or WebP image.");
    if (file.size > 2 * 1024 * 1024) return setLogoError("The logo must be 2 MB or smaller.");
    setLogoBusy(true);
    try {
      setLogo(await uploadRawFileToCloudinary(file, await signReviewLogoUpload()));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (rating < 1) next.rating = "Please pick a rating";
    if (authorName.trim().length < 2) next.name = "Please enter your name";
    if (comment.trim().length < 10) next.comment = "Please write at least a few words";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (logoBusy) return;
    setSending(true);
    try {
      const payload = { authorName: authorName.trim(), authorCompany: company.trim(), rating, comment: comment.trim(), website };
      const withLogo = { ...payload, ...(logo ? { logo } : {}) };
      await (target.kind === "influencer" ? submitReview(target.username, withLogo) : submitServiceReview(withLogo));
      onSent({ id: `local-${Date.now()}`, authorName: payload.authorName, authorCompany: payload.authorCompany || null, rating, comment: payload.comment, createdAt: new Date().toISOString(), logoUrl: logo?.url ?? null });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your review. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTimeout(() => setDone(false), 300); }}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{labels.formTitle.replace("{name}", name)}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div role="status" className="py-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-500 text-on-accent">
              <Check className="size-6" aria-hidden />
            </span>
            <p className="mt-4 text-body font-semibold text-heading">{labels.thanks}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <p className="text-body-sm text-neutral-500">{labels.formIntro}</p>
            <div>
              <Label>{labels.yourRating}</Label>
              <div className="mt-1.5 flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label={labels.yourRating}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="rounded p-0.5">
                    <Star className={cn("size-8 transition-colors", n <= (hover || rating) ? "fill-[#f5b301] text-[#f5b301]" : "text-neutral-300")} aria-hidden />
                  </button>
                ))}
              </div>
              <FieldError>{errors.rating}</FieldError>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rv-name">{labels.yourName}</Label>
                <Input id="rv-name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} aria-invalid={!!errors.name} maxLength={100} />
                <FieldError>{errors.name}</FieldError>
              </div>
              <div>
                <Label htmlFor="rv-company">{labels.yourCompany}</Label>
                <Input id="rv-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={150} />
              </div>
            </div>
            <div>
              <Label htmlFor="rv-text">{labels.yourReview}</Label>
              <Textarea id="rv-text" value={comment} onChange={(e) => setComment(e.target.value)} aria-invalid={!!errors.comment} maxLength={1000} rows={5} />
              <div className="mt-1 flex justify-between">
                <FieldError>{errors.comment}</FieldError>
                <span className="ml-auto text-label text-neutral-500">{comment.length}/1000</span>
              </div>
            </div>
            {(
              <div>
                <Label htmlFor="rv-logo">{labels.logo ?? "Brand / company logo (optional)"}</Label>
                {/* the native file input stays hidden; the box and the button both open the file picker */}
                <input ref={logoInput} id="rv-logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={logoBusy} onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} className="sr-only" />
                <div className="mt-1.5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => logoInput.current?.click()}
                    disabled={logoBusy}
                    aria-label={logo ? "Change logo" : "Upload logo"}
                    className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 transition-colors hover:border-accent-500 hover:text-accent-500"
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- just-uploaded Cloudinary file
                      <img src={logo.url} alt="" className="size-full bg-white object-contain p-1.5" />
                    ) : logoBusy ? (
                      <span className="text-label">…</span>
                    ) : (
                      <ImagePlus className="size-6" aria-hidden />
                    )}
                  </button>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => logoInput.current?.click()} disabled={logoBusy} className="rounded-full bg-accent-500 px-4 py-2 text-body-sm font-semibold text-on-accent hover:opacity-90 disabled:opacity-60">
                        {logoBusy ? "Uploading…" : logo ? "Change logo" : "Upload logo"}
                      </button>
                      {logo && !logoBusy && (
                        <button type="button" onClick={() => setLogo(null)} className="rounded-full border border-neutral-300 px-4 py-2 text-body-sm font-semibold text-heading hover:border-accent-500">
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-label text-neutral-500">PNG, JPG or WebP · up to 2 MB</p>
                    <FieldError>{logoError}</FieldError>
                  </div>
                </div>
              </div>
            )}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-label="Website" />
            </div>
            <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-body-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-60">
              {sending ? "…" : labels.submit}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({ r, i }: { r: InfluencerReviewRead; i: number }) {
  const date = new Date(r.createdAt);
  return (
    <article style={{ ["--d" as string]: `${(i % 6) * 0.06}s` }} className="fade-up flex h-full flex-col rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-6">
      <div className="flex items-center justify-between gap-3">
        <Stars value={r.rating} />
        <Quote className="size-6 text-accent-500" aria-hidden />
      </div>
      <p className="mt-4 flex-1 whitespace-pre-line text-body-sm text-heading">{r.comment}</p>
      <div className="mt-5 flex items-center gap-3 border-t border-neutral-200 pt-4">
        {r.logoUrl ? (
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary logo */}
            <img src={r.logoUrl} alt="" loading="lazy" className="size-full object-contain p-1" />
          </span>
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-500 font-heading text-body-sm font-extrabold text-on-accent" aria-hidden>
            {r.authorName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-body-sm font-bold text-heading">{r.authorName}</p>
          <p className="truncate text-label text-neutral-500">
            {[r.authorCompany, Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { month: "short", year: "numeric" })].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </article>
  );
}

// Infinite slider: the list is repeated until it is wide enough, then rendered twice and the track moves by
// exactly -50% (same seamless-loop trick as the tech marquee). Plain scroll when motion is reduced.
function ReviewsMarqueeTrack({ reviews, speed, pauseOnHover }: { reviews: InfluencerReviewRead[]; speed: number; pauseOnHover: boolean }) {
  const reps = Math.max(1, Math.ceil(6 / reviews.length));
  const half = Array.from({ length: reps }).flatMap(() => reviews);
  const seconds = Math.round(speed * Math.max(1, half.length / 6));
  const set = (hidden: boolean) => (
    <ul className="flex shrink-0 items-stretch gap-4 pr-4" aria-hidden={hidden || undefined}>
      {half.map((r, i) => (
        <li key={`${r.id}-${i}`} className="w-80 shrink-0 sm:w-96">
          <ReviewCard r={r} i={0} />
        </li>
      ))}
    </ul>
  );
  return (
    <div
      className="mt-8 overflow-hidden motion-reduce:overflow-x-auto"
      style={{ maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)" }}
    >
      <div
        className="reviews-marquee-track flex w-max"
        style={{ ["--reviews-marquee-duration" as string]: `${seconds}s`, ...(pauseOnHover ? {} : { animationPlayState: "running" }) }}
      >
        {set(false)}
        {set(true)}
      </div>
    </div>
  );
}

export function ReviewsSection({
  reviews,
  average,
  count,
  target,
  name,
  labels,
  heading,
  description,
  marquee,
}: {
  reviews: InfluencerReviewRead[];
  average: number;
  count: number;
  target: ReviewTarget;
  name: string;
  labels: ReviewLabels;
  heading: React.CSSProperties;
  description?: string;
  /** Admin-controlled slider; off = the plain grid */
  marquee?: { enabled: boolean; speed: number; pauseOnHover: boolean };
}) {
  const [open, setOpen] = React.useState(false);
  const [shown, setShown] = React.useState(6);
  const [mine, setMine] = React.useState<InfluencerReviewRead[]>([]);
  // a review just sent from this browser shows straight away (the page itself refreshes within seconds)
  const all = [...mine.filter((m) => !reviews.some((r) => r.comment === m.comment && r.authorName === m.authorName)), ...reviews];
  const total = reviews.length > 0 || mine.length === 0 ? count + (all.length - reviews.length) : all.length;
  const avg = all.length > 0 && total > 0 ? (average * count + mine.filter((m) => all.includes(m)).reduce((n, m) => n + m.rating, 0)) / (count + (all.length - reviews.length)) : average;
  const visible = all.slice(0, shown);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="font-heading font-extrabold leading-none text-heading" style={heading}>
            {labels.heading}
          </h2>
          {description && <p className="mt-3 max-w-3xl text-left text-body text-neutral-500">{description}</p>}
          {total > 0 && (
            <p className="mt-4 flex items-center gap-3 text-body-sm text-neutral-500">
              <Stars value={Math.round(avg)} size="size-5" />
              <span className="font-heading text-body-lg font-extrabold text-heading">{avg.toFixed(1)}</span>
              <span>({countText(labels.reviewsCount, total)})</span>
            </p>
          )}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-body-sm font-bold text-on-accent hover:opacity-90">
          <Star className="size-4" aria-hidden /> {labels.write}
        </button>
      </div>

      {all.length === 0 ? (
        <div className="mt-8 flex items-center justify-between gap-6 rounded-[var(--radius-2xl)] border border-dashed border-neutral-300 bg-neutral-50 p-8 sm:p-10">
          <p className="max-w-md text-body-sm text-neutral-500">{labels.empty}</p>
          <div className="hidden items-center gap-1 text-neutral-300 sm:flex" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-7" />
            ))}
          </div>
        </div>
      ) : (
        marquee?.enabled ? (
          <ReviewsMarqueeTrack reviews={all} speed={marquee.speed} pauseOnHover={marquee.pauseOnHover} />
        ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((r, i) => (
              <ReviewCard key={r.id} r={r} i={i} />
            ))}
          </div>
          {shown < all.length && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => setShown((n) => n + 6)} className="inline-flex items-center rounded-full border border-neutral-300 px-7 py-3 text-body-sm font-semibold text-heading hover:border-accent-500">
                {labels.showMore}
              </button>
            </div>
          )}
        </>
        )
      )}

      <ReviewDialog open={open} onOpenChange={setOpen} target={target} name={name} labels={labels} onSent={(r) => setMine((m) => [r, ...m])} />
    </div>
  );
}
