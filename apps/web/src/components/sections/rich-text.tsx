import { Container, Heading, Reveal, RichText } from "@agency/ui";
import { str, type Content } from "./types";

export function RichTextSection({ content }: { content: Content }) {
  const eyebrow = str(content.eyebrow);
  const heading = str(content.heading);
  const body = str(content.body);
  if (!heading && !body) return null;

  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        <Reveal className="mx-auto max-w-3xl">
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          {heading && <Heading level={2}>{heading}</Heading>}
          {body && <RichText html={body} className={heading ? "mt-8" : ""} />}
        </Reveal>
      </Container>
    </section>
  );
}
