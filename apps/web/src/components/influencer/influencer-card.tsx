import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Star, TrendingUp, Users } from "lucide-react";
import { Card, Badge, cn } from "@agency/ui";
import { formatCurrency } from "@agency/utils";
import type { InfluencerCardRead } from "@/lib/influencer-types";
import {
  badgeColorProps,
  discountBadgeColorProps,
  formatCompactNumber,
  formatDiscountBadge,
  formatDiscountedPrice,
  formatEngagementRate,
  formatStartingPrice,
} from "@/lib/influencer-format";

export function InfluencerCard({ influencer }: { influencer: InfluencerCardRead }) {
  const discount = influencer.startingPrice?.discount ?? null;
  const discountBadgeProps = discount && discountBadgeColorProps(discount.color);

  return (
    <Link href={`/influencers/${influencer.username}`}>
      <Card className="h-full overflow-hidden p-0">
        {/* Not overflow-hidden -- only the cover-image box below is, so the
            profile photo (positioned to hang below it) doesn't get clipped
            by its parent's own overflow. */}
        <div className="relative">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
            {influencer.coverImage && (
              <Image
                src={influencer.coverImage.url}
                alt=""
                fill
                className="object-cover transition-transform duration-slow ease-[var(--ease-premium)] group-hover:scale-105"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />
          </div>

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {discount && discountBadgeProps && (
              <Badge className={cn("border-transparent", discountBadgeProps.className)} style={discountBadgeProps.style}>
                {formatDiscountBadge(discount, influencer.startingPrice!.currency)}
              </Badge>
            )}
            {influencer.isFeatured && <Badge className="border-transparent bg-amber-500 text-white">Featured</Badge>}
            {(influencer.badges ?? []).slice(0, 2).map((b) => {
              const badgeProps = badgeColorProps(b.color);
              return (
                <Badge key={b.key} className={cn("border-transparent", badgeProps.className)} style={badgeProps.style}>
                  {b.label}
                </Badge>
              );
            })}
            {!influencer.availableForBooking && <Badge variant="neutral">Fully booked</Badge>}
          </div>

          <div className="absolute -bottom-8 left-4">
            <div className="relative size-16 overflow-hidden rounded-2xl border-4 border-background bg-neutral-100 shadow-soft-md">
              {influencer.profilePhoto && (
                <Image src={influencer.profilePhoto.url} alt={influencer.name} fill className="object-cover" sizes="64px" />
              )}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-11">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 truncate text-h4 font-semibold text-heading">
                {influencer.name}
                {influencer.isVerified && <BadgeCheck className="size-4 shrink-0 text-accent-500" />}
              </h3>
              <p className="truncate text-body-sm text-neutral-400">@{influencer.username}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-body-sm font-medium text-heading">
              <Star className="size-3.5 fill-current text-warning-500" />
              {Number(influencer.ratingAverage).toFixed(1)}
              <span className="text-neutral-400">({influencer.ratingCount})</span>
            </div>
          </div>

          {influencer.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {influencer.categories.slice(0, 2).map((c) => (
                <Badge key={c.id} variant="neutral">
                  {c.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
            {influencer.totalFollowers > 0 ? (
              <div className="flex items-center gap-1.5 text-body-sm text-body">
                <Users className="size-4 text-neutral-400" />
                <span className="font-medium text-heading">{formatCompactNumber(influencer.totalFollowers)}</span>
                <span className="text-neutral-400">total followers</span>
              </div>
            ) : (
              <span className="text-body-sm text-neutral-400">No platform yet</span>
            )}
            {influencer.totalFollowers > 0 && (
              <div className="flex items-center gap-1.5 text-label text-neutral-400">
                <TrendingUp className="size-3.5" />
                {formatEngagementRate(influencer.totalEngagementRate)} total eng.
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            {influencer.startingPrice?.discount ? (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="text-body-sm font-medium text-heading">
                  From {formatDiscountedPrice(influencer.startingPrice, influencer.startingPrice.discount.amountOff)}
                </span>
                <span className="text-label text-neutral-400 line-through">
                  {formatCurrency(Number(influencer.startingPrice.price), influencer.startingPrice.currency || "USD")}
                </span>
              </div>
            ) : (
              <p className="text-body-sm font-medium text-heading">{formatStartingPrice(influencer.startingPrice)}</p>
            )}
            {(influencer.city || influencer.countryCode) && (
              <span className="flex items-center gap-1 text-label text-neutral-400">
                <MapPin className="size-3.5" />
                {[influencer.city, influencer.countryCode].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
