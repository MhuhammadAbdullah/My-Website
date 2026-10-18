import type * as React from "react";
import type { CmsSectionRead } from "@/lib/types";
import type { Content } from "./types";
import { HeroSection } from "./hero";
import { RichTextSection } from "./rich-text";
import { CtaBandSection } from "./cta-band";
import { FaqSection } from "./faq";
import { MarqueeSection } from "./marquee";
import { ServicesListSection } from "./services-list";
import { SelectedWorkSection } from "./selected-work";
import { ResultsSection } from "./results";
import { ProcessSection } from "./process";
import { PricingSection } from "./pricing";
import { TestimonialsSection } from "./testimonials";
import { InquirySection } from "./inquiry";
import { BookingCtaSection, ClientLogosSection, FounderNoteSection, LatestInsightsSection, NewsletterSection } from "./optional";

// section `type` -> renderer. A type listed in @agency/types SECTION_TYPES
// but missing here simply renders nothing (never a broken block). To add a
// section: define it in packages/types/src/sections.ts, then register it here.
type Renderer = (props: { content: Content; priority?: boolean }) => React.ReactNode | Promise<React.ReactNode>;

const RENDERERS: Record<string, Renderer> = {
  hero: HeroSection,
  rich_text: RichTextSection,
  cta_band: CtaBandSection,
  faq: FaqSection,
  marquee: MarqueeSection,
  services_list: ServicesListSection,
  selected_work: SelectedWorkSection,
  results: ResultsSection,
  process: ProcessSection,
  pricing: PricingSection,
  testimonials: TestimonialsSection,
  inquiry_form: InquirySection,
  client_logos: ClientLogosSection,
  founder_note: FounderNoteSection,
  latest_insights: LatestInsightsSection,
  booking_cta: BookingCtaSection,
  newsletter: NewsletterSection,
};

export function SectionRenderer({ sections }: { sections: CmsSectionRead[] }) {
  return (
    <>
      {sections.map((section, index) => {
        const Render = RENDERERS[section.type];
        if (!Render) return null;
        // Only the first block can be the LCP image; everything else lazy-loads.
        return <Render key={section.id} content={section.content} priority={index === 0} />;
      })}
    </>
  );
}
