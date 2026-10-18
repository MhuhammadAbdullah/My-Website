import { Container, Heading, Reveal } from "@agency/ui";
import { CmsButton } from "./cms-button";
import { str, type ButtonValue, type Content } from "./types";

// Accent-coloured band; text on the accent is always near-black.
export function CtaBandSection({ content }: { content: Content }) {
  const heading = str(content.heading);
  const body = str(content.body);
  const button = content.button as ButtonValue | undefined;
  if (!heading && !body) return null;

  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        <Reveal className="rounded-[var(--radius-2xl)] bg-accent-500 px-8 py-16 text-center text-on-accent sm:px-16">
          {heading && (
            <Heading level={2} className="mx-auto max-w-3xl !text-[#0b0b0c] [&_em]:!text-[#0b0b0c] [&_em]:underline">
              {heading}
            </Heading>
          )}
          {body && <p className="mx-auto mt-5 max-w-xl text-body-lg !text-[#0b0b0c]/80">{body}</p>}
          <div className="mt-8 flex justify-center">
            <CmsButton button={button} onAccent />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
