"use client";

import { useEffect } from "react";
import { Button, Container, Heading } from "@agency/ui";

// Catches failures thrown by getInfluencerServerSession() (see
// lib/influencer-server-session.ts) and any other dashboard data fetch --
// deliberately does NOT redirect to login. A thrown error here means the
// session cookie is present (middleware already checked that) but something
// transient went wrong loading data, not that the user is logged out.
export default function InfluencerDashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] py-16">
      <Container className="max-w-lg text-center">
        <Heading level={2}>Something went wrong</Heading>
        <p className="mt-3 text-body text-neutral-600">
          We couldn't load your dashboard just now. Your session is still active — this is usually a temporary
          connection issue.
        </p>
        <Button className="mt-6" onClick={() => reset()}>
          Try again
        </Button>
      </Container>
    </div>
  );
}
