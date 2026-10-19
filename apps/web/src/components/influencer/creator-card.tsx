"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, Star, Tag, TrendingUp, User, Users } from "lucide-react";
import { VerifiedBadge } from "@/components/influencer/verified-badge";
import { cn } from "@agency/ui";
import { formatCurrency } from "@agency/utils";
import type { InfluencerCardRead } from "@/lib/influencer-types";
import { badgeColorProps, discountBadgeColorProps, formatCompactNumber, formatDiscountBadge, formatDiscountedPrice, formatEngagementRate } from "@/lib/influencer-format";
import { useShortlist } from "./shortlist";

export interface CreatorCardLabels {
  viewProfile: string;
  shortlist: string;
  shortlisted: string;
  followers: string;
  engagement: string;
  from: string;
  newCreator: string;
}

// Marketplace card. Two per row on phones (compact: icons instead of words), roomier from `sm` up.
export function CreatorCard({ influencer: c, labels }: { influencer: InfluencerCardRead; labels: CreatorCardLabels }) {
  const { has, toggle } = useShortlist();
  const saved = has(c.id);
  const photo = c.profilePhoto?.url ?? c.coverImage?.url ?? null;
  const rating = Number(c.ratingAverage);
  const discount = c.startingPrice?.discount ?? null;
  const price = c.startingPrice
    ? discount
      ? formatDiscountedPrice(c.startingPrice, discount.amountOff)
      : formatCurrency(Number(c.startingPrice.price), c.startingPrice.currency || "USD")
    : "Custom";
  const followers = c.totalFollowers > 0 ? formatCompactNumber(c.totalFollowers) : "—";
  const engagement = c.totalFollowers > 0 ? formatEngagementRate(c.totalEngagementRate) : "—";
  const ratingText = c.ratingCount > 0 ? rating.toFixed(1) : labels.newCreator;
  const pill = "inline-flex max-w-full items-center truncate rounded-full px-2 py-1 text-[0.6rem] font-bold uppercase leading-none tracking-wide shadow-sm sm:px-2.5 sm:text-[0.7rem]";

  return (
    <article className={cn("flex h-full min-w-0 flex-col rounded-[14px] border bg-neutral-50 p-1.5 transition-colors sm:rounded-[var(--radius-xl)] sm:p-3", saved ? "border-accent-500" : "border-neutral-200")}>
      <Link href={`/influencers/${c.username}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-[10px] bg-neutral-100 sm:aspect-[4/3] sm:rounded-[var(--radius-lg)]">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- remote creator photo
            <img src={photo} alt={c.name} loading="lazy" className="size-full object-cover" />
          )}
          <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1 sm:inset-x-3 sm:top-3 sm:gap-1.5">
            {c.categories[0] && <span className={cn(pill, "bg-[#0b0b0c]/80 text-[var(--accent)] backdrop-blur")}>{c.categories[0].name}</span>}
            {discount && c.startingPrice && (
              <span className={cn(pill, discountBadgeColorProps(discount.color).className)} style={discountBadgeColorProps(discount.color).style}>
                {formatDiscountBadge(discount, c.startingPrice.currency)}
              </span>
            )}
            {c.isFeatured && <span className={cn(pill, "bg-accent-500 text-on-accent")}>Featured</span>}
            {(c.badges ?? []).slice(0, 2).map((b) => (
              <span key={b.key} className={cn(pill, badgeColorProps(b.color).className)} style={badgeColorProps(b.color).style}>
                {b.label}
              </span>
            ))}
          </div>
          {!c.availableForBooking && <span className={cn(pill, "absolute bottom-2 left-2 bg-[#0b0b0c] text-[#f2f2ee] sm:bottom-3 sm:left-3")}>Fully booked</span>}
          {/* phones: rating sits on the photo to save a row */}
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-[#0b0b0c]/80 px-2 py-1 text-[0.65rem] font-semibold leading-none text-[#f2f2ee] backdrop-blur sm:hidden">
            <Star className="size-3 fill-current text-[#f5b301]" aria-hidden /> {ratingText}
          </span>
        </div>
      </Link>

      <div className="mt-2 flex items-start justify-between gap-2 px-0.5 sm:mt-4 sm:px-1">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1 font-heading text-body-sm font-extrabold text-heading sm:text-body-lg">
            <span className="truncate">{c.name}</span>
            {c.isVerified && <VerifiedBadge className="size-4 shrink-0 sm:size-5" />}
          </h3>
          <p className="truncate text-label text-neutral-500 sm:text-body-sm">
            @{c.username}
            {c.city && <span className="hidden sm:inline"> · {c.city}</span>}
          </p>
        </div>
        <p className="hidden shrink-0 text-body-sm font-medium text-heading sm:block">★ {ratingText}</p>
      </div>

      {/* phones: three compact rows with icons */}
      <dl className="mt-2 grid gap-1.5 rounded-[10px] bg-background px-2.5 py-2 md:hidden">
        <div className="flex items-center gap-2" title={labels.followers}>
          <Users className="size-3.5 shrink-0 text-neutral-500" aria-hidden />
          <dt className="sr-only">{labels.followers}</dt>
          <dd className="truncate text-label font-bold text-heading">{followers}</dd>
        </div>
        <div className="flex items-center gap-2" title={labels.engagement}>
          <TrendingUp className="size-3.5 shrink-0 text-accent-500" aria-hidden />
          <dt className="sr-only">{labels.engagement}</dt>
          <dd className="truncate text-label font-bold text-accent-500">{engagement}</dd>
        </div>
        <div className="flex items-center gap-2" title={labels.from}>
          <Tag className="size-3.5 shrink-0 text-neutral-500" aria-hidden />
          <dt className="sr-only">{labels.from}</dt>
          <dd className="truncate text-label font-bold text-heading">{price}</dd>
        </div>
      </dl>

      {/* tablet / desktop: three columns with labels */}
      <dl className="mt-4 hidden justify-between gap-2 rounded-[10px] lg:rounded-[var(--radius-lg)] bg-background px-2.5 py-4 text-center md:flex lg:gap-3 lg:px-4 lg:py-5">
        <div>
          <dd className="whitespace-nowrap font-heading text-[0.85rem] font-extrabold md:text-[0.95rem] xl:text-[1rem] text-heading">{followers}</dd>
          <dt className="mt-1.5 text-label text-neutral-500">{labels.followers}</dt>
        </div>
        <div>
          <dd className="whitespace-nowrap font-heading text-[0.85rem] font-extrabold md:text-[0.95rem] xl:text-[1rem] text-accent-500">{engagement}</dd>
          <dt className="mt-1.5 text-label text-neutral-500">{labels.engagement}</dt>
        </div>
        <div>
          <dd className="whitespace-nowrap font-heading text-[0.85rem] font-extrabold md:text-[0.95rem] xl:text-[1rem] text-heading">{price}</dd>
          <dt className="mt-1.5 text-label text-neutral-500">{labels.from}</dt>
        </div>
      </dl>

      <div className="mt-auto flex gap-1.5 pt-2 sm:gap-2 sm:pt-4">
        <Link
          href={`/influencers/${c.username}`}
          aria-label={labels.viewProfile}
          title={labels.viewProfile}
          className="inline-flex flex-1 items-center justify-center rounded-[10px] border border-neutral-200 px-3 py-2 sm:rounded-full text-body-sm font-semibold text-heading hover:border-accent-500 sm:py-3"
        >
          <User className="size-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">{labels.viewProfile}</span>
        </Link>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? labels.shortlisted : labels.shortlist}
          title={saved ? labels.shortlisted : labels.shortlist}
          onClick={() => toggle({ id: c.id, name: c.name, username: c.username })}
          className={cn(
            "inline-flex flex-1 items-center justify-center rounded-[10px] px-3 py-2 text-body-sm font-bold sm:rounded-full transition-colors sm:py-3",
            saved ? "bg-accent-500 text-on-accent" : "bg-[var(--inv-bg,#f2f2ee)] text-[var(--inv-fg,#0b0b0c)] hover:opacity-90",
          )}
        >
          {saved ? <BookmarkCheck className="size-4 sm:hidden" aria-hidden /> : <Bookmark className="size-4 sm:hidden" aria-hidden />}
          <span className="hidden sm:inline">{saved ? labels.shortlisted : labels.shortlist}</span>
        </button>
      </div>
    </article>
  );
}
