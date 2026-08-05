import { Progress } from "@agency/ui";
import type { InfluencerAudienceInsightRead, InfluencerAudienceLocationRead } from "@/lib/influencer-types";

// Every row here is a single-category magnitude (a percentage of one named
// bucket), not a multi-series comparison -- so identity is carried by the
// adjacent text label, and color only ever encodes magnitude via one hue
// (accent-500, via the shared <Progress> track). That sidesteps needing a
// validated categorical palette for what's structurally a sequential value
// per row, per the dataviz skill's "color follows the job" rule.
function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-body-sm">
        <span className="text-body">{label}</span>
        <span className="font-medium text-heading">{value.toFixed(0)}%</span>
      </div>
      <Progress value={value} label={label} className="mt-1.5" />
    </div>
  );
}

export const AGE_GROUP_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];

export function AudienceInsights({
  insight,
  locations,
}: {
  insight: InfluencerAudienceInsightRead | null;
  locations: InfluencerAudienceLocationRead[];
}) {
  if (!insight && locations.length === 0) return null;

  const ageEntries = insight
    ? Object.entries(insight.ageGroups).sort(
        ([a], [b]) => AGE_GROUP_ORDER.indexOf(a) - AGE_GROUP_ORDER.indexOf(b),
      )
    : [];

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {insight && (
        <div className="space-y-5">
          <h3 className="text-label uppercase tracking-wide text-neutral-400">Gender</h3>
          <div className="space-y-3">
            <StatBar label="Female" value={Number(insight.genderFemalePercent)} />
            <StatBar label="Male" value={Number(insight.genderMalePercent)} />
            <StatBar label="Other" value={Number(insight.genderOtherPercent)} />
          </div>
        </div>
      )}

      {ageEntries.length > 0 && (
        <div className="space-y-5">
          <h3 className="text-label uppercase tracking-wide text-neutral-400">Age groups</h3>
          <div className="space-y-3">
            {ageEntries.map(([group, value]) => (
              <StatBar key={group} label={group} value={Number(value)} />
            ))}
          </div>
        </div>
      )}

      {locations.length > 0 && (
        <div className="space-y-5 sm:col-span-2">
          <h3 className="text-label uppercase tracking-wide text-neutral-400">Audience location</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {locations.map((loc) => (
              <StatBar key={loc.id} label={loc.name} value={Number(loc.percentage)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
