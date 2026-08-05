// Engagement rate is never client-supplied (see influencerPlatformSchema's
// comment) -- always computed here from the same raw numbers the influencer
// entered, on both the registration path (influencer-applications.routes.ts)
// and the post-approval self-service edit path (influencer-me.routes.ts), so
// the figure shown everywhere (dashboard, public profile, badge scoring) is
// a real calculation, not a typed guess. Standard feed-engagement formula:
// (likes + comments + shares) / followers, as a percentage.
export function computePlatformEngagementRate(p: {
  followers: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
}): number {
  if (p.followers <= 0) return 0;
  return ((p.avgLikes + p.avgComments + p.avgShares) / p.followers) * 100;
}
