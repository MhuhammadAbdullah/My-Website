"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Container, Heading, Input, Label, toast } from "@agency/ui";
import { influencerAuthClient } from "@/lib/influencer-auth-client";

function PasswordField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} className="pr-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 hover:text-heading"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

// A normal page (not a modal over an empty page, which left the header and footer squashed together behind it).
function ResetPasswordInner() {
  const router = useRouter();
  const token = useSearchParams().get("token");
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
    <section className="flex min-h-[70vh] items-center py-10">
      <Container>
        <div className="influencer-auth mx-auto w-full max-w-md rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50 p-8 sm:p-10">
          <Heading level={1} style={{ fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.5rem)" }}>
            Set a new password
          </Heading>

          {done ? (
            <div className="mt-6 text-center">
              <CheckCircle2 className="mx-auto size-12 text-accent-500" aria-hidden />
              <p className="mt-3 text-body-sm text-neutral-500">Your password has been updated.</p>
              <button type="button" onClick={() => router.push("/influencer/login")} className="mt-6 w-full rounded-full bg-accent-500 px-6 py-3 text-body-sm font-bold text-on-accent hover:opacity-90">
                Back to login
              </button>
            </div>
          ) : !token ? (
            <p className="mt-4 text-body-sm text-neutral-500">
              This reset link is invalid or has expired. Please request a new one from the{" "}
              <Link href="/influencer/login" className="font-semibold text-accent-500 hover:underline">
                login page
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <PasswordField id="new-password" value={password} onChange={setPassword} />
                <p className="mt-1.5 text-label text-neutral-500">At least 8 characters.</p>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm password</Label>
                <PasswordField id="confirm-password" value={confirm} onChange={setConfirm} />
              </div>
              <button type="submit" disabled={submitting} className="w-full rounded-full bg-accent-500 px-6 py-3 text-body-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-60">
                {submitting ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
