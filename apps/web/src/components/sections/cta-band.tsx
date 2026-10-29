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
    <section className="bg-background py-10 md:py-16">
      <Container>
        <Reveal className="flex flex-col items-start justify-between gap-8 rounded-[var(--radius-2xl)] bg-accent-500 px-7 py-10 text-on-accent sm:px-12 sm:py-12 lg:flex-row lg:items-center lg:px-16 lg:py-14">
          <div className="w-full max-w-[58rem]">
            {heading && (
              <Heading
                level={2}
                className="!text-[#0b0b0c] [&_em]:!text-[#0b0b0c] [&_em]:underline [&_em]:decoration-2 [&_em]:underline-offset-8"
                style={{ fontSize: "clamp(3rem, 4.2vw, 4.75rem)", lineHeight: 0.9 }}
              >
                {heading}
              </Heading>
            )}
            {body && <p className="mt-5 max-w-2xl text-body-lg !text-[#0b0b0c]/80">{body}</p>}
          </div>
          <CmsButton button={button} onAccent size="lg" className="shrink-0 !px-8 !text-white" />
        </Reveal>
      </Container>
    </section>
  );
}
