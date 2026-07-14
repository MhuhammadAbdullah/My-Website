import { Accordion, AccordionItem, AccordionTrigger, AccordionContent, Heading, Reveal } from "@agency/ui";
import type { FaqRead } from "@/lib/types";
import { getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";

// Async Server Component: when a page doesn't pass an explicit `title`
// override (no current caller does), falls back to the sitewide
// `faq_section_heading` SiteSetting -- admin-editable from Settings -- rather
// than a hardcoded literal, so this heading stays in sync across Home, About,
// and Contact from one place.
export async function FaqSection({ faqs, title }: { faqs: FaqRead[]; title?: string }) {
  if (faqs.length === 0) return null;

  const resolvedTitle =
    title ??
    (await withFallback(getSettings(), {}, "settings").then((s) => s.faq_section_heading)) ??
    "Frequently asked questions";

  return (
    <div className="mx-auto max-w-3xl">
      <Reveal>
        <Heading level={2} className="text-center">
          {resolvedTitle}
        </Heading>
      </Reveal>
      <Reveal delay={0.1} className="mt-10">
        <Accordion type="single" collapsible>
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </div>
  );
}
