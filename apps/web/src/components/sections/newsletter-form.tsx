"use client";

import * as React from "react";
import { env } from "@/lib/env";

export function NewsletterForm({
  placeholder,
  buttonLabel,
  successMessage,
  errorMessage,
}: {
  placeholder: string;
  buttonLabel: string;
  successMessage: string;
  errorMessage: string;
}) {
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState(""); // honeypot
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setState("failed");
    setState("sending");
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/cms/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "newsletter", email, website, source: window.location.pathname }),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <p role="status" className="mt-6 font-semibold text-heading">
        {successMessage}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="newsletter-email">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        autoComplete="email"
        className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-background px-5 py-3 text-body text-heading placeholder:text-neutral-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
      />
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-label="Website" />
      </div>
      <button type="submit" disabled={state === "sending"} className="rounded-full bg-accent-500 px-6 py-3 font-bold text-on-accent hover:opacity-90 disabled:opacity-60">
        {state === "sending" ? "…" : buttonLabel}
      </button>
      {state === "failed" && (
        <p role="alert" className="text-body-sm text-error-500 sm:basis-full">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
