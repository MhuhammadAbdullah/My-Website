import type { Metadata } from "next";
import { Container, Section, Heading, Breadcrumb } from "@agency/ui";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of the Calibre Digital website and services.",
};

export default function TermsPage() {
  return (
    <Section>
      <Container className="mx-auto max-w-3xl">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Terms" }]} />
        <Heading level={1} className="mt-6">
          Terms of Service
        </Heading>
        <p className="mt-2 text-body-sm text-neutral-500">Last updated: January 1, 2026</p>

        <div className="mt-10 space-y-8 text-body text-body">
          <section>
            <Heading level={3}>1. Services</Heading>
            <p className="mt-2">
              Calibre Digital provides web design, development, and related digital services as scoped in
              an individual project agreement or statement of work. These terms govern use of our website;
              project-specific terms are set out separately for each engagement.
            </p>
          </section>
          <section>
            <Heading level={3}>2. Acceptable use</Heading>
            <p className="mt-2">
              You agree not to misuse this website, including attempting to gain unauthorized access to any
              part of it, interfering with its normal operation, or submitting fraudulent information
              through our forms.
            </p>
          </section>
          <section>
            <Heading level={3}>3. Intellectual property</Heading>
            <p className="mt-2">
              All content on this site — copy, design, and code — is the property of Calibre Digital unless
              otherwise noted, and may not be reproduced without permission.
            </p>
          </section>
          <section>
            <Heading level={3}>4. Affiliate links</Heading>
            <p className="mt-2">
              Some pages contain affiliate links. See our Affiliate Tools page for full disclosure of this
              relationship.
            </p>
          </section>
          <section>
            <Heading level={3}>5. Limitation of liability</Heading>
            <p className="mt-2">
              This website and its content are provided "as is" without warranties of any kind. Calibre
              Digital is not liable for any indirect or consequential damages arising from use of this
              site.
            </p>
          </section>
          <section>
            <Heading level={3}>6. Governing law</Heading>
            <p className="mt-2">
              These terms are governed by the laws of the State of Texas, without regard to its conflict of
              law provisions.
            </p>
          </section>
        </div>
      </Container>
    </Section>
  );
}
