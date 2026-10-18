import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Container, Heading, Reveal, RichText } from "@agency/ui";
import { toJsonLd } from "@/lib/seo";
import Link from "next/link";
import { arr, str, type ButtonValue, type Content } from "./types";

interface Faq {
  id: string;
  question: string;
  answer: string;
}

const stripTags = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function FaqSection({ content }: { content: Content }) {
  const eyebrow = str(content.eyebrow);
  const heading = str(content.heading);
  const firstOpen = content.firstOpen !== false;
  const helpLine = str(content.helpLine);
  const helpLink = content.helpLink as ButtonValue | undefined;

  const fromCollection = arr<Faq>(content.faqs).filter((f) => f.question && f.answer);
  const own = arr<{ question?: string; answer?: string }>(content.items)
    .filter((f) => str(f.question) && str(f.answer))
    .map((f, i) => ({ id: `own-${i}`, question: str(f.question), answer: str(f.answer) }));
  const faqs = [...fromCollection, ...own];
  if (faqs.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: stripTags(f.answer) },
    })),
  };

  return (
    <section className="py-[var(--spacing-section)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            {heading && <Heading level={2}>{heading}</Heading>}
            {(helpLine || helpLink?.label) && (
              <p className="mt-6 text-body text-neutral-500">
                {helpLine}{" "}
                {helpLink?.label && helpLink.href && (
                  <Link href={helpLink.href} className="font-semibold text-accent-500 underline-offset-4 hover:underline" {...(helpLink.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {helpLink.label}
                  </Link>
                )}
              </p>
            )}
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible defaultValue={firstOpen ? faqs[0]!.id : undefined}>
              {faqs.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger>{f.question}</AccordionTrigger>
                  <AccordionContent>
                    <RichText html={f.answer} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
