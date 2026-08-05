"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, DialogHeader, DialogTitle, Input, Label, toast } from "@agency/ui";
import { influencerAuthClient } from "@/lib/influencer-auth-client";
import { InfluencerAuthModal } from "@/components/influencer/auth-modal";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("This reset link is invalid or has expired.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await influencerAuthClient.resetPassword({ newPassword: password, token });
      if (error) {
        toast.error(error.message ?? "Couldn't reset your password. Please request a new link.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <InfluencerAuthModal onRequestClose={() => router.push("/influencer/login")}>
      <DialogHeader>
        <DialogTitle>Set a new password</DialogTitle>
      </DialogHeader>

      {done ? (
        <>
          <p className="text-body-sm text-neutral-600">Your password has been updated.</p>
          <Button className="mt-6 w-full" onClick={() => router.push("/influencer/login")}>
            Back to login
          </Button>
        </>
      ) : !token ? (
        <p className="text-body-sm text-neutral-600">
          This reset link is invalid or has expired. Please request a new one from the login page.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? "Saving…" : "Set new password"}
          </Button>
        </form>
      )}
    </InfluencerAuthModal>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
