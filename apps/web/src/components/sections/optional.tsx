import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container, Heading, Reveal } from "@agency/ui";
import { cloudinaryTransform } from "@/lib/cloudinary";
import { CmsButton } from "./cms-button";
import { CmsImage } from "./cms-image";
import { NewsletterForm } from "./newsletter-form";
import { arr, img, str, type ButtonValue, type Content } from "./types";

// ---------------------------------------------------------------- client logos
export function ClientLogosSection({ content }: { content: Content }) {
  const heading = str(content.heading);
  const logos = arr<{ logo?: unknown; href?: string }>(content.logos).filter((l) => img(l.logo));
  if (logos.length === 0) return null;
  return (
    <section className="py-[calc(var(--spacing-section)/1.5)]">
      <Container>
        {heading && <p className="eyebrow mb-8 text-center">{heading}</p>}
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {logos.map((l, i) => {
            const image = img(l.logo)!;
            const el = (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
              <img src={cloudinaryTransform(image.url, "f_auto,q_auto,h_96")} alt={image.alt || ""} loading="lazy" className="h-9 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" />
            );
            return <li key={i}>{str(l.href) ? <a href={str(l.href)} target="_blank" rel="noopener noreferrer">{el}</a> : el}</li>;
          })}
        </ul>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- founder note
export function FounderNoteSection({ content }: { content: Content }) {
  const quote = str(content.quote);
  const name = str(content.name);
  const photo = img(content.photo);
  const signature = img(content.signature);
  if (!quote) return null;
  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        <Reveal className="grid items-center gap-10 rounded-[var(--radius-2xl)] border border-neutral-200 bg-surface p-8 sm:p-14 md:grid-cols-[auto_1fr]">
          {photo && <CmsImage image={photo} className="size-40 rounded-full object-cover md:size-56" sizes="224px" />}
          <figure>
            <blockquote className="font-body text-[clamp(1.25rem,1rem+1.2vw,1.875rem)] font-medium leading-snug text-heading">{quote}</blockquote>
            <figcaption className="mt-6 flex items-center gap-4">
              {signature && <CmsImage image={signature} className="h-12 w-auto object-contain" sizes="160px" />}
              <span>
                {name && <span className="block font-bold text-heading">{name}</span>}
                {str(content.role) && <span className="block text-body-sm text-neutral-500">{str(content.role)}</span>}
              </span>
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------- latest insights
// There is no blog in this site yet, so posts are entered here by hand.
export function LatestInsightsSection({ content }: { content: Content }) {
  const posts = arr<{ title?: string; excerpt?: string; href?: string; date?: string; image?: unknown }>(content.posts).filter((p) => str(p.title) && str(p.href));
  if (posts.length === 0) return null;
  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        {(str(content.heading) || str(content.eyebrow)) && (
          <Reveal className="mb-12">
            {str(content.eyebrow) && <p className="eyebrow mb-4">{str(content.eyebrow)}</p>}
            {str(content.heading) && <Heading level={2}>{str(content.heading)}</Heading>}
          </Reveal>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((p, i) => {
            const image = img(p.image);
            return (
              <Reveal key={i} delay={i * 0.06}>
                <Link href={str(p.href)} className="group block h-full rounded-[var(--radius-xl)] border border-neutral-200 bg-surface p-4 transition-colors hover:border-accent-500">
                  {image && <CmsImage image={image} className="mb-4 aspect-[16/10] w-full rounded-xl object-cover" sizes="(min-width: 768px) 33vw, 100vw" />}
                  {str(p.date) && <p className="text-label text-neutral-400">{str(p.date)}</p>}
                  <h3 className="mt-1 flex items-start justify-between gap-3 font-heading text-h4 font-extrabold text-heading">
                    {str(p.title)}
                    <ArrowUpRight className="mt-1 size-5 shrink-0 text-neutral-400 group-hover:text-accent-500" aria-hidden />
                  </h3>
                  {str(p.excerpt) && <p className="mt-2 line-clamp-3 text-body-sm text-neutral-500">{str(p.excerpt)}</p>}
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

// ----------------------------------------------------------------- booking CTA
export function BookingCtaSection({ content }: { content: Content }) {
  const heading = str(content.heading);
  const embed = str(content.embedUrl);
  const button = content.button as ButtonValue | undefined;
  if (!heading && !embed) return null;
  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        <Reveal className="rounded-[var(--radius-2xl)] border border-neutral-200 bg-surface p-8 text-center sm:p-14">
          {heading && <Heading level={2}>{heading}</Heading>}
          {str(content.body) && <p className="mx-auto mt-5 max-w-xl text-body-lg text-neutral-500">{str(content.body)}</p>}
          <div className="mt-8 flex justify-center">
            <CmsButton button={button} />
          </div>
          {/^https:\/\//i.test(embed) && (
            <iframe src={embed} title={heading || "Book a call"} loading="lazy" className="mt-10 h-[640px] w-full rounded-xl border border-neutral-200" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
          )}
        </Reveal>
      </Container>
    </section>
  );
}

// ------------------------------------------------------------------ newsletter
export function NewsletterSection({ content }: { content: Content }) {
  const heading = str(content.heading);
  if (!heading) return null;
  return (
    <section className="py-[calc(var(--spacing-section)/1.5)]">
      <Container>
        <Reveal className="mx-auto max-w-2xl rounded-[var(--radius-2xl)] border border-neutral-200 bg-surface p-8 text-center sm:p-12">
          <Heading level={3}>{heading}</Heading>
          {str(content.body) && <p className="mt-3 text-body-sm text-neutral-500">{str(content.body)}</p>}
          <NewsletterForm
            placeholder={str(content.placeholder) || "you@example.com"}
            buttonLabel={str(content.buttonLabel) || "Subscribe"}
            successMessage={str(content.successMessage) || "You're subscribed."}
            errorMessage={str(content.errorMessage) || "Something went wrong. Please try again."}
          />
        </Reveal>
      </Container>
    </section>
  );
}
