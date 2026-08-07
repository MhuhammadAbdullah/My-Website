import { Card, Container, Heading, Section } from "@agency/ui";
import { cloudinaryTransform, cloudinaryVideoPoster } from "@/lib/cloudinary";
import type { InfluencerPortfolioItemRead } from "@/lib/influencer-types";

// Portfolio is video-only (no image upload, no metadata fields -- see
// InfluencerPortfolioItem's schema comment) and the API already caps this to
// at most 4 public items, so there's no branching or trimming to do here.
//
// Tiles are reel-shaped (9:16, matching Instagram Reels) with real native
// controls (play + sound) and no autoplay -- the visitor chooses to press
// play, rather than every tile auto-looping muted in the background. No
// hover animation either; the video itself is the interactive element now,
// not a preview button that opens a bigger popup.
export function PortfolioGallery({ items }: { items: InfluencerPortfolioItemRead[] }) {
  if (items.length === 0) return null;

  return (
    <Section className="pt-0">
      <Container>
        <Heading level={2}>Previous Brand Promotions</Heading>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="w-full overflow-hidden p-0">
              <div className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-100">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- arbitrary influencer-uploaded video, no caption track exists to reference */}
                <video
                  src={cloudinaryTransform(item.media.url, "vc_h264")}
                  poster={cloudinaryVideoPoster(item.media.url)}
                  controls
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                />
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
