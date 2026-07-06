import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Card, CardContent } from "@agency/ui";
import { cloudinaryTransform } from "@/lib/cloudinary";
import type { TestimonialRead } from "@/lib/types";

export function TestimonialCard({ testimonial }: { testimonial: TestimonialRead }) {
  return (
    <Card className="h-full hover:-translate-y-0.5">
      <CardContent className="pt-6">
        <div className="flex gap-0.5 text-accent-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`size-4 ${i < testimonial.rating ? "fill-current" : "fill-none text-neutral-200"}`} />
          ))}
        </div>
        <p className="mt-4 text-body-lg text-heading">&ldquo;{testimonial.quote}&rdquo;</p>
        <div className="mt-6 flex items-center gap-3">
          <Avatar className="size-10">
            {testimonial.avatar && (
              <AvatarImage
                src={cloudinaryTransform(testimonial.avatar.url, "f_auto,q_auto,w_80,h_80,c_fill,g_face")}
                alt={testimonial.author}
              />
            )}
            <AvatarFallback>{testimonial.author.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-body-sm font-medium text-heading">{testimonial.author}</p>
            <p className="text-body-sm text-neutral-500">
              {[testimonial.role, testimonial.company].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
