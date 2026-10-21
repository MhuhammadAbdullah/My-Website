"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button, Label, toast } from "@agency/ui";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";

function ResetPasswordInner() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return toast.error("This reset link is invalid or has expired.");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("The two passwords do not match");
    setBusy(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) {
        toast.error(error.message ?? "Could not reset your password. Please request a new link.");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Set a new password">
      {done ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-10 text-accent-500" aria-hidden />
          <p className="mt-3 text-body-sm text-neutral-500">Your password has been updated.</p>
          <Button asChild className="mt-6 w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      ) : !token ? (
        <p className="text-center text-body-sm text-neutral-500">
          This reset link is invalid or has expired.{" "}
          <Link href="/forgot-password" className="font-semibold text-accent-500 hover:underline">
            Request a new one
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1.5 text-label text-neutral-500">At least 8 characters.</p>
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Set new password"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
