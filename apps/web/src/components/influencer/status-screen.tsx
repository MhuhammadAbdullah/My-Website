"use client";

import { useRouter } from "next/navigation";
import { Badge, Button, Heading } from "@agency/ui";
import { influencerAuthClient } from "@/lib/influencer-auth-client";
import type { InfluencerMeRead } from "@/lib/influencer-types";

const COPY: Record<InfluencerMeRead["status"], { badge: "warning" | "error" | "accent"; title: string; body: string }> = {
  PENDING: {
    badge: "warning",
    title: "Your application is under review",
    body: "Our team reviews every application by hand. We'll email you as soon as there's an update — no action is needed right now.",
  },
  NEEDS_MORE_INFO: {
    badge: "accent",
    title: "We need a bit more information",
    body: "Check your email for details on what we still need from you, then reply directly to that email.",
  },
  REJECTED: {
    badge: "error",
    title: "Your application wasn't approved",
    body: "You're welcome to apply again in the future if your profile changes.",
  },
  SUSPENDED: {
    badge: "error",
    title: "Your account is suspended",
    body: "Contact our team if you believe this is a mistake.",
  },
  APPROVED: { badge: "accent", title: "", body: "" },
};

export function InfluencerStatusScreen({ me }: { me: InfluencerMeRead }) {
  const router = useRouter();
  const copy = COPY[me.status];

  async function handleSignOut() {
    await influencerAuthClient.signOut();
    router.push("/influencers");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-neutral-200 p-8 text-center">
      <Badge variant={copy.badge}>{me.status.replace(/_/g, " ")}</Badge>
      <Heading level={2} className="mt-4">
        {copy.title}
      </Heading>
      <p className="mt-3 text-body text-neutral-600">{copy.body}</p>
      {me.status === "REJECTED" && me.rejectionReason && (
        <p className="mt-3 text-body-sm text-neutral-500">
          <strong>Reason:</strong> {me.rejectionReason}
        </p>
      )}
      <Button variant="outline" className="mt-6" onClick={handleSignOut}>
        Log out
      </Button>
    </div>
  );
}
