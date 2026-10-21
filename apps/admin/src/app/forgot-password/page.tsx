"use client";

import * as React from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button, Input, Label, toast } from "@agency/ui";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth-card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error("Enter a valid email address");
    setBusy(true);
    try {
      const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${window.location.origin}/reset-password` });
      if (error) {
        toast.error(error.message ?? "Could not send the reset link. Please try again.");
        return;
      }
      // Same message whether or not the address exists, so this page cannot be used to find admin emails.
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Forgot password" subtitle={sent ? undefined : "Enter your admin email and we will send you a link to set a new password."}>
      {sent ? (
        <div className="text-center">
          <MailCheck className="mx-auto size-10 text-accent-500" aria-hidden />
          <p className="mt-3 text-body-sm text-neutral-500">If an admin account exists for {email.trim()}, a reset link is on its way. It expires in 1 hour.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-body-sm">
        <Link href="/login" className="font-semibold text-accent-500 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
