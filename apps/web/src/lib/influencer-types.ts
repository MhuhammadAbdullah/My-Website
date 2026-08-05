// Read-model shapes returned by the Influencer Marketplace API. Kept
// separate from ./types.ts, which covers the original public-site content
// domain (services/portfolio/etc) -- this is a big enough new domain to
// warrant its own file, matching how its Zod schemas got their own
// packages/types/src/influencer.ts rather than being folded into an
// existing one.

import type { SeoRead } from "./types";

export interface InfluencerMediaRead {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
}

export interface InfluencerCategoryRead {
  id: string;
  name: string;
  slug: string;
}

export interface InfluencerAudienceInsightRead {
  genderMalePercent: string;
  genderFemalePercent: string;
  genderOtherPercent: string;
  ageGroups: Record<string, number>;
}

export interface InfluencerAudienceLocationRead {
  id: string;
  level: "COUNTRY" | "STATE" | "CITY";
  name: string;
  percentage: string;
}

// Audience demographics are scoped per platform (brief §19/§20) -- each
// platform carries its own optional insight/location breakdown, not one
// blended profile-wide set.
export interface InfluencerPlatformRead {
  id: string;
  platform: string;
  handle: string | null;
  profileUrl: string | null;
  followers: number;
  following: number;
  posts: number;
  engagementRate: string;
  accountReach: number;
  avgReach: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgSaves: number;
  isPrimary: boolean;
  audienceInsight: InfluencerAudienceInsightRead | null;
  audienceLocations: InfluencerAudienceLocationRead[];
}

export interface InfluencerPricingItemRead {
  id: string;
  customLabel: string | null;
  price: string;
  currency: string | null;
  isEnabled: boolean;
  deliverableType: { key: string; label: string };
}

// Best currently-live, auto-apply (codeless) discount for a priced item --
// attached server-side (see toDiscountedPrice in influencers.routes.ts) so
// the frontend never has to re-derive scope/date/usage eligibility itself.
export interface InfluencerDiscountDisplay {
  type: "PERCENT" | "FIXED";
  value: number;
  amountOff: number;
  color: string | null;
}

export interface InfluencerPricingCardRead {
  id: string;
  title: string;
  price: string | null;
  currency: string | null;
  estimatedDeliveryTime: string | null;
  description: string | null;
  features: string[];
  isCustomQuote: boolean;
  isEnabled: boolean;
  discount: InfluencerDiscountDisplay | null;
}

// What `include: { media: true }` (no `select`) actually returns for the
// portfolioItems relation specifically (verified against both the
// self-service and public backend query sites) -- richer than the general
// InfluencerMediaRead, which is also used against select-restricted queries
// elsewhere that don't necessarily include these fields.
export interface InfluencerPortfolioMediaRead extends InfluencerMediaRead {
  publicId: string;
  format: string | null;
  bytes: number | null;
}

// Video-only, no metadata -- see InfluencerPortfolioItem's schema comment.
export interface InfluencerPortfolioItemRead {
  id: string;
  isPublic: boolean;
  media: InfluencerPortfolioMediaRead;
}

export interface InfluencerProfileRead {
  id: string;
  username: string;
  tagline: string | null;
  bio: string | null;
  countryCode: string | null;
  city: string | null;
  languages: string[];
  availableForBooking: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  publicStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  preferredPayoutMethod: string | null;
  profilePhoto: InfluencerMediaRead | null;
  coverImage: InfluencerMediaRead | null;
  categories: InfluencerCategoryRead[];
  platforms: InfluencerPlatformRead[];
  pricingItems: InfluencerPricingItemRead[];
  pricingCards: InfluencerPricingCardRead[];
  portfolioItems: InfluencerPortfolioItemRead[];
}

export interface InfluencerMeRead {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_MORE_INFO" | "SUSPENDED";
  appliedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  profile: InfluencerProfileRead | null;
}

// ---------------------------------------------------------------------------
// Public marketplace (listing + detail) read models -- GET /influencers,
// GET /influencers/:username (apps/api/src/routes/influencers.routes.ts).
// ---------------------------------------------------------------------------

export interface InfluencerBadgeRead {
  key: string;
  label: string;
  iconKey: string | null;
  color: string | null;
}

export interface InfluencerCardRead {
  id: string;
  username: string;
  name: string;
  tagline: string | null;
  countryCode: string | null;
  city: string | null;
  languages: string[];
  isVerified: boolean;
  isFeatured: boolean;
  availableForBooking: boolean;
  ratingAverage: string;
  ratingCount: number;
  profilePhoto: InfluencerMediaRead | null;
  coverImage: InfluencerMediaRead | null;
  categories: InfluencerCategoryRead[];
  badges: InfluencerBadgeRead[];
  totalFollowers: number;
  totalEngagementRate: number;
  startingPrice: { price: string; currency: string | null; discount: InfluencerDiscountDisplay | null } | null;
}

export interface InfluencerCollaborationRead {
  id: string;
  brandName: string;
  brandLogo: InfluencerMediaRead | null;
  description: string | null;
  resultSummary: string | null;
}

export interface InfluencerReviewRead {
  id: string;
  authorName: string;
  authorCompany: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Bookings -- public submission confirmation + influencer's own booking list/
// detail (apps/api/src/routes/bookings.routes.ts, influencer-me.routes.ts).
// ---------------------------------------------------------------------------

export interface BookingRequiredDeliverableRead {
  deliverableTypeKey: string;
  label: string;
  price: number;
  currency: string;
}

export interface BookingListItemRead {
  id: string;
  bookingNumber: string;
  status: string;
  businessName: string;
  campaignType: string;
  netInfluencerEarning: string | null;
  createdAt: string;
}

export interface BookingStatusHistoryRead {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  changedBy: { name: string } | null;
  changedByInfluencer: { name: string } | null;
}

export interface BookingDetailRead {
  id: string;
  bookingNumber: string;
  status: string;
  businessName: string;
  campaignObjective: string;
  industry: string;
  product: string;
  budget: string;
  campaignType: string;
  targetAudience: string;
  requiredDeliverables: BookingRequiredDeliverableRead[];
  timeline: string;
  notes: string | null;
  grossAmount: string | null;
  commissionPercent: string | null;
  commissionAmount: string | null;
  netInfluencerEarning: string | null;
  createdAt: string;
  attachments: { id: string; media: InfluencerMediaRead }[];
  statusHistory: BookingStatusHistoryRead[];
  allowedTransitions: string[];
}

export interface InfluencerDetailRead {
  id: string;
  username: string;
  tagline: string | null;
  bio: string | null;
  countryCode: string | null;
  city: string | null;
  languages: string[];
  isVerified: boolean;
  isFeatured: boolean;
  availableForBooking: boolean;
  ratingAverage: string;
  ratingCount: number;
  influencer: { name: string };
  profilePhoto: InfluencerMediaRead | null;
  coverImage: InfluencerMediaRead | null;
  categories: InfluencerCategoryRead[];
  badges: InfluencerBadgeRead[];
  platforms: InfluencerPlatformRead[];
  pricingItems: InfluencerPricingItemRead[];
  pricingCards: InfluencerPricingCardRead[];
  portfolioItems: InfluencerPortfolioItemRead[];
  collaborations: InfluencerCollaborationRead[];
  reviews: InfluencerReviewRead[];
  seo: SeoRead | null;
}

// ---------------------------------------------------------------------------
// Earnings, payouts, payout methods, invoices -- influencer's own dashboard
// tabs (apps/api/src/routes/influencer-me.routes.ts, influencer-payouts.routes.ts).
// ---------------------------------------------------------------------------

export interface InfluencerEarningsSummary {
  totalEarned: string | number;
  completedCampaigns: number;
  totalPaidOut: string | number;
  pendingPayout: string | number;
  availableBalance: number;
}

export interface InfluencerActivityItem {
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  createdAt: string;
}

export interface InfluencerDashboardStats {
  bookings: { total: number; pending: number; completed: number; cancelled: number };
  earnings: { totalEarnings: number; lifetimeEarnings: number; pendingEarnings: number; availableBalance: number };
  payouts: { total: number; pending: number };
  totalInvoices: number;
  monthlyEarnings: { month: string; amount: number }[];
  monthlyBookings: { month: string; count: number }[];
  bookingsByStatus: { status: string; count: number }[];
  recentActivity: InfluencerActivityItem[];
}

export interface InfluencerPayoutListItemRead {
  id: string;
  payoutNumber: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  totalAmount: string;
  currency: string;
  method: string;
  createdAt: string;
  processedAt: string | null;
}

// One row per (discount, this influencer) -- a platform-wide ALL/CATEGORY
// discount still needs this influencer's own approval, same as an
// INFLUENCER-scoped one just for them (see DiscountInfluencerResponse).
export interface InfluencerDiscountRead {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  respondedAt: string | null;
  createdAt: string;
  discount: {
    id: string;
    code: string | null;
    label: string;
    type: "PERCENT" | "FIXED";
    value: string;
    startsAt: string | null;
    endsAt: string | null;
    maxUses: number | null;
    usedCount: number;
    minBookingAmount: string | null;
    isActive: boolean;
  };
}

export interface InfluencerPayoutMethodRead {
  id: string;
  type: string;
  details: Record<string, string>;
  isDefault: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
}

export interface InfluencerNotificationRead {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}
