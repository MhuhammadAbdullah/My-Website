"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@agency/types";
import { Button, DialogHeader, DialogTitle, FieldError, Input, Label, toast } from "@agency/ui";
import { influencerAuthClient } from "@/lib/influencer-auth-client";
import { InfluencerApiError, requestLoginOtp, verifyLoginOtp } from "@/lib/influencer-api";

type Phase = "password" | "otp" | "forgot" | "forgot-sent";

const RESEND_COOLDOWN_SECONDS = 30;

// Rendered inside the shared InfluencerAuthModal by InfluencerAuthFlow --
// self-contained (owns its own DialogHeader, since the title depends on
// which phase it's in) so the modal shell itself doesn't need to know
// anything about login's internal password/otp/forgot state machine.
export function InfluencerLoginForm({
  onSwitchToRegister,
  onRequestClose,
}: {
  onSwitchToRegister: () => void;
  onRequestClose: () => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("password");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{phase === "otp" ? "Enter your code" : phase.startsWith("forgot") ? "Reset your password" : "Influencer login"}</DialogTitle>
      </DialogHeader>

      {phase === "password" && (
        <PasswordStep onVerified={() => setPhase("otp")} onForgot={() => setPhase("forgot")} onSwitchToRegister={onSwitchToRegister} />
      )}
      {phase === "otp" && <OtpStep onRequestClose={onRequestClose} />}
      {phase === "forgot" && <ForgotStep onSent={() => setPhase("forgot-sent")} onBack={() => setPhase("password")} />}
      {phase === "forgot-sent" && <ForgotSentStep onBack={() => setPhase("password")} />}
    </>
  );
}

function PasswordStep({
  onVerified,
  onForgot,
  onSwitchToRegister,
}: {
  onVerified: () => void;
  onForgot: () => void;
  onSwitchToRegister: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(data: SignInInput) {
    const { error } = await influencerAuthClient.signIn.email(data);
    if (error) {
      toast.error(error.message ?? "Invalid email or password");
      return;
    }
    try {
      await requestLoginOtp();
      onVerified();
    } catch (otpError) {
      toast.error(otpError instanceof Error ? otpError.message : "Couldn't send a login code. Please try again.");
    }
  }

  return (
    <>
      <p className="text-body-sm text-neutral-600">Log in to manage your bookings, profile, and payouts.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <button type="button" onClick={onForgot} className="text-body-sm text-accent-600 hover:underline">
              Forgot password?
            </button>
          </div>
          <Input id="password" type="password" {...register("password")} aria-invalid={!!errors.password} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-body-sm text-neutral-500">
        Not a member yet?{" "}
        <button type="button" onClick={onSwitchToRegister} className="text-accent-600 hover:underline">
          Apply to become an influencer
        </button>
      </p>
    </>
  );
}

const DASHBOARD_PATH = "/influencer/dashboard";

function OtpStep({ onRequestClose }: { onRequestClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [code, setCode] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(RESEND_COOLDOWN_SECONDS);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Once OTP verification succeeds we navigate to the dashboard first and
  // only close the popup after that navigation has actually landed (pathname
  // flips to DASHBOARD_PATH) -- closing eagerly races Next's router (see
  // below) and also visually closes the popup before there's anything to
  // reveal underneath it. The timeout is a safety net in case the pathname
  // never updates (e.g. middleware bounces back to /influencer/login because
  // the session cookie hadn't landed yet) so the popup can't get stuck open.
  React.useEffect(() => {
    if (!redirecting) return;
    if (pathname === DASHBOARD_PATH) {
      onRequestClose();
      return;
    }
    const timer = setTimeout(onRequestClose, 4000);
    return () => clearTimeout(timer);
  }, [redirecting, pathname, onRequestClose]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      await verifyLoginOtp(code);
      // Navigate first -- calling onRequestClose() before router.push() was
      // breaking the redirect entirely: closing the popup restores the
      // pre-modal URL via a raw window.history.pushState(), which stomps on
      // Next's App Router history state right before router.push() runs and
      // makes the dashboard navigation silently no-op.
      setRedirecting(true);
      router.refresh();
      router.push(DASHBOARD_PATH);
    } catch (error) {
      toast.error(error instanceof InfluencerApiError ? error.message : "That code is incorrect or has expired.");
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await requestLoginOtp();
      toast.success("New code sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't resend the code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <p className="text-body-sm text-neutral-600">We emailed a 6-digit code to your address. Enter it below to finish logging in.</p>

      <form onSubmit={handleVerify} className="mt-6 space-y-5" noValidate>
        <div>
          <Label htmlFor="otp">Login code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center text-h4 tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
        <Button type="submit" size="lg" disabled={verifying} className="w-full">
          {redirecting ? "Loading your dashboard…" : verifying ? "Verifying…" : "Verify & log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-neutral-500">
        Didn't get a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-accent-600 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Resending…" : "Resend code"}
        </button>
      </p>
    </>
  );
}

function ForgotStep({ onSent, onBack }: { onSent: () => void; onBack: () => void }) {
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      await influencerAuthClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/influencer/reset-password`,
      });
      onSent();
    } catch {
      // Deliberately still advances -- better-auth returns a generic success
      // either way to avoid leaking which emails have accounts.
      onSent();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <p className="text-body-sm text-neutral-600">Enter your account email and we'll send you a link to reset your password.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <div>
          <Label htmlFor="forgot-email">Email</Label>
          <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-body-sm text-neutral-500">
        <button type="button" onClick={onBack} className="text-accent-600 hover:underline">
          Back to login
        </button>
      </p>
    </>
  );
}

function ForgotSentStep({ onBack }: { onBack: () => void }) {
  return (
    <>
      <p className="text-body-sm text-neutral-600">
        If an account exists for that email, we've sent a link to reset your password. Check your inbox.
      </p>
      <p className="mt-6 text-center text-body-sm text-neutral-500">
        <button type="button" onClick={onBack} className="text-accent-600 hover:underline">
          Back to login
        </button>
      </p>
    </>
  );
}
