import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge, Card, SocialIcon } from "@agency/ui";
import type { InfluencerPlatformRead } from "@/lib/influencer-types";
import { formatCompactNumber, formatEngagementRate, platformIconId, platformLabel } from "@/lib/influencer-format";

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
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {iconId ? (
            <SocialIcon platform={iconId} className="size-5 text-heading" />
          ) : (
            <span className="flex size-5 items-center justify-center text-label font-semibold text-heading">
              {platform.platform.slice(0, 1)}
            </span>
          )}
          <div>
            <p className="font-medium text-heading">{platformLabel(platform.platform)}</p>
            {platform.handle && <p className="text-label text-neutral-400">@{platform.handle}</p>}
          </div>
        </div>
        {platform.isPrimary && <Badge variant="accent">Primary</Badge>}
      </div>

      <div className="mt-5 flex items-baseline gap-4">
        <div>
          <p className="text-h3 font-semibold text-heading">{formatCompactNumber(platform.followers)}</p>
          <p className="text-label text-neutral-400">Followers</p>
        </div>
        <div>
          <p className="text-h4 font-semibold text-heading">{formatEngagementRate(platform.engagementRate)}</p>
          <p className="text-label text-neutral-400">Engagement</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-neutral-100 pt-4">
        {STAT_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-baseline justify-between text-body-sm">
            <span className="text-neutral-400">{label}</span>
            <span className="font-medium text-heading">{formatCompactNumber(Number(platform[key]))}</span>
          </div>
        ))}
      </div>

      {platform.profileUrl && (
        <Link
          href={platform.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex items-center gap-1.5 text-body-sm font-medium text-accent-600 hover:underline"
        >
          View profile <ExternalLink className="size-3.5" />
        </Link>
      )}
    </Card>
  );
}
