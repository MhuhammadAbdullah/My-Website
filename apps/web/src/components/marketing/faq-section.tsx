import { Accordion, AccordionItem, AccordionTrigger, AccordionContent, Heading, Reveal } from "@agency/ui";
import type { FaqRead } from "@/lib/types";

export function FaqSection({ faqs, title = "Frequently asked questions" }: { faqs: FaqRead[]; title?: string }) {
  if (faqs.length === 0) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <Reveal>
        <Heading level={2} className="text-center">
          {title}
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
