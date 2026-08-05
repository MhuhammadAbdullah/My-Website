import { Star } from "lucide-react";
import { Card } from "@agency/ui";
import type { InfluencerReviewRead } from "@/lib/influencer-types";

function ReviewCard({ review, hidden }: { review: InfluencerReviewRead; hidden: boolean }) {
  return (
    <Card aria-hidden={hidden} className="flex h-full w-80 shrink-0 flex-col p-6 sm:w-96">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`size-4 ${i < review.rating ? "fill-current text-warning-500" : "text-neutral-200"}`} />
        ))}
      </div>
      <p className="mt-3 line-clamp-4 text-body-sm text-body">{review.comment}</p>
      <p className="mt-3 text-label text-neutral-400">
        {review.authorName}
        {review.authorCompany ? `, ${review.authorCompany}` : ""}
      </p>
    </Card>
  );
}

// Same CSS-only seamless-loop technique as TechMarquee
// (apps/web/src/components/marketing/tech-marquee.tsx) -- duplicating the
// list once and translating the track by exactly -50% makes the loop
// boundary indistinguishable from the gap between any other two cards.
export function ReviewsMarquee({ reviews }: { reviews: InfluencerReviewRead[] }) {
  if (reviews.length === 0) return null;
  const doubled = [...reviews, ...reviews];

  return (
    <div
      className="overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div className="reviews-marquee-track flex w-max items-stretch gap-6">
        {doubled.map((review, i) => (
          <ReviewCard key={`${review.id}-${i}`} review={review} hidden={i >= reviews.length} />
        ))}
      </div>
    </div>
  );
}
