import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Container, Section, Heading } from "@agency/ui";

export default function NotFound() {
  return (
    <Section className="flex min-h-[70vh] items-center">
      <Container className="text-center">
        <p className="font-mono text-label uppercase tracking-wide text-accent-500">Error 404</p>
        <Heading level={1} display className="mt-4">
          This page **wandered off**.
        </Heading>
        <p className="mx-auto mt-4 max-w-md text-body-lg text-body">
          The page you're looking for doesn't exist, or has moved somewhere else.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">
            Back to home <ArrowUpRight />
          </Link>
        </Button>
      </Container>
    </Section>
  );
}
