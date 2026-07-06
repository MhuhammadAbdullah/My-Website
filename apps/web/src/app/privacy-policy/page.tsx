import type { Metadata } from "next";
import { Container, Section, Heading, Breadcrumb } from "@agency/ui";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Calibre Digital collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <Section>
      <Container className="mx-auto max-w-3xl">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
        <Heading level={1} className="mt-6">
          Privacy Policy
        </Heading>
        <p className="mt-2 text-body-sm text-neutral-500">Last updated: January 1, 2026</p>

        <div className="prose-legal mt-10 space-y-8 text-body text-body">
          <section>
            <Heading level={3}>1. Information we collect</Heading>
            <p className="mt-2">
              We collect information you provide directly, such as your name, email address, phone number,
              and project details submitted through our contact form, along with standard technical data
              (IP address, browser type, pages visited) collected automatically via analytics.
            </p>
          </section>
          <section>
            <Heading level={3}>2. How we use your information</Heading>
            <p className="mt-2">
              We use the information you provide to respond to inquiries, scope and deliver projects, send
              service-related communications, and improve our website. We do not sell your personal
              information.
            </p>
          </section>
          <section>
            <Heading level={3}>3. Cookies and analytics</Heading>
            <p className="mt-2">
              We use cookies and similar technologies to understand how visitors use our site and to
              improve performance. You can control cookies through your browser settings.
            </p>
          </section>
          <section>
            <Heading level={3}>4. Data sharing</Heading>
            <p className="mt-2">
              We share data only with service providers that help us operate our business (hosting,
              email, analytics) under agreements that protect your information, or where required by law.
            </p>
          </section>
          <section>
            <Heading level={3}>5. Your rights</Heading>
            <p className="mt-2">
              You may request access to, correction of, or deletion of your personal data at any time by
              contacting us at the email address listed on our Contact page.
            </p>
          </section>
          <section>
            <Heading level={3}>6. Changes to this policy</Heading>
            <p className="mt-2">
              We may update this policy periodically. Material changes will be reflected by an updated
              "last updated" date above.
            </p>
          </section>
        </div>
      </Container>
    </Section>
  );
}
