import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge, Card, SocialIcon } from "@agency/ui";
import type { InfluencerPlatformRead } from "@/lib/influencer-types";
import { formatCompactNumber, formatEngagementRate, platformIconId, platformLabel } from "@/lib/influencer-format";
import { AnimatedNumber } from "@/components/influencer/animated-number";

const STAT_FIELDS: { key: keyof InfluencerPlatformRead; label: string }[] = [
  { key: "following", label: "Following" },
  { key: "posts", label: "Posts" },
  { key: "avgReach", label: "Avg. reach" },
  { key: "avgViews", label: "Avg. views" },
  { key: "avgLikes", label: "Avg. likes" },
  { key: "avgComments", label: "Avg. comments" },
  { key: "avgShares", label: "Avg. shares" },
  { key: "avgSaves", label: "Avg. saves" },
];

export function PlatformAnalyticsCard({ platform }: { platform: InfluencerPlatformRead }) {
  const iconId = platformIconId(platform.platform);

  return (
    <Card className="h-full p-6 hover:translate-y-0 hover:shadow-soft-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {iconId ? (
            <SocialIcon platform={iconId} className="size-7 shrink-0 text-heading" />
          ) : (
            <span className="flex size-6 shrink-0 items-center justify-center font-heading text-body-sm font-extrabold text-heading">{platform.platform.slice(0, 1)}</span>
          )}
          <div className="min-w-0">
            <p className="font-heading text-[1.5rem] font-extrabold leading-tight tracking-tight text-heading">{platformLabel(platform.platform)}</p>
            {platform.handle && <p className="truncate text-label text-neutral-500">@{platform.handle}</p>}
          </div>
        </div>
        {platform.isPrimary && <Badge variant="accent">Primary</Badge>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <p className="text-[clamp(1.875rem,1.5rem+1vw,2.5rem)] font-extrabold leading-none tracking-tight text-heading">
            <AnimatedNumber value={formatCompactNumber(platform.followers)} />
          </p>
          <p className="mt-2 text-label font-semibold uppercase tracking-wider text-neutral-500">Followers</p>
        </div>
        <div className="min-w-0">
          <p className="text-[clamp(1.875rem,1.5rem+1vw,2.5rem)] font-extrabold leading-none tracking-tight text-accent-500">
            <AnimatedNumber value={formatEngagementRate(platform.engagementRate)} />
          </p>
          <p className="mt-2 text-label font-semibold uppercase tracking-wider text-neutral-500">Engagement</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-neutral-200 pt-5">
        {STAT_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex min-w-0 items-baseline justify-between gap-3">
            <dt className="whitespace-nowrap text-[13px] text-neutral-500">{label}</dt>
            <dd className="text-body-sm font-bold tabular-nums text-heading">{formatCompactNumber(Number(platform[key]))}</dd>
          </div>
        ))}
      </dl>

      {platform.profileUrl && (
        <Link href={platform.profileUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-body-sm font-bold text-accent-500 hover:underline">
          View profile <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      )}
    </Card>
  );
}
