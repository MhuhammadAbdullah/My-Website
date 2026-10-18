import { arr, str, type Content } from "./types";
import { TestimonialsSlider, type SliderTestimonial } from "./testimonials-slider";

interface Raw {
  id: string;
  quote?: string;
  author?: string;
  role?: string | null;
  company?: string | null;
  avatar?: { url: string; alt: string } | null;
}

export function TestimonialsSection({ content }: { content: Content }) {
  const items: SliderTestimonial[] = arr<Raw>(content.testimonials)
    .filter((t) => str(t.quote) && str(t.author))
    .map((t) => ({ id: t.id, quote: str(t.quote), author: str(t.author), role: t.role, company: t.company, avatar: t.avatar }));
  if (items.length === 0) return null;

  return (
    <TestimonialsSlider
      eyebrow={str(content.eyebrow)}
      heading={str(content.heading)}
      items={items}
      autoplay={content.autoplay === true}
      intervalSeconds={typeof content.intervalSeconds === "number" ? content.intervalSeconds : 7}
    />
  );
}
