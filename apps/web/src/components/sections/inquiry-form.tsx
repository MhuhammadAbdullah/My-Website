"use client";

import * as React from "react";
import Script from "next/script";
import { cn } from "@agency/ui";
import { env } from "@/lib/env";

export interface InquiryFormProps {
  heading: string;
  body: string;
  email: string;
  showPhone: boolean;
  showCompany: boolean;
  showService: boolean;
  showBudget: boolean;
  serviceOptions: string[];
  budgetOptions: string[];
  submitLabel: string;
  successMessage: string;
  errorMessage: string;
  turnstileSiteKey: string;
}

type Errors = Partial<Record<"name" | "email" | "message", string>>;

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string };
  }
}

const fieldClass =
  "w-full rounded-xl border border-neutral-300 bg-[#0b0b0c] px-4 py-3 text-body text-[#f2f2ee] placeholder:text-neutral-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/40 aria-[invalid=true]:border-error-500";

export function InquiryForm(props: InquiryFormProps) {
  const [values, setValues] = React.useState({ name: "", email: "", phone: "", company: "", service: "", budget: "", message: "", website: "" });
  const [errors, setErrors] = React.useState<Errors>({});
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [serverError, setServerError] = React.useState("");
  const [token, setToken] = React.useState("");
  const captchaRef = React.useRef<HTMLDivElement>(null);
  const rendered = React.useRef(false);

  const mountCaptcha = React.useCallback(() => {
    if (!props.turnstileSiteKey || rendered.current || !captchaRef.current || !window.turnstile) return;
    rendered.current = true;
    window.turnstile.render(captchaRef.current, { sitekey: props.turnstileSiteKey, callback: setToken, "expired-callback": () => setToken("") });
  }, [props.turnstileSiteKey]);

  React.useEffect(() => {
    mountCaptcha();
  }, [mountCaptcha]);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (values.name.trim().length < 2) next.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "Please enter a valid email address.";
    if (values.message.trim().length < 10) next.message = "Tell us a little more (at least 10 characters).";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (props.turnstileSiteKey && !token) {
      setServerError("Please complete the spam check below.");
      setState("failed");
      return;
    }

    setState("sending");
    setServerError("");
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/cms/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "inquiry", ...values, turnstileToken: token, source: window.location.pathname }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setServerError(res.status === 429 ? (body?.error ?? "") : "");
        throw new Error("failed");
      }
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  const label = (text: string, id: string, optional = false) => (
    <label htmlFor={id} className="mb-1.5 block text-body-sm font-semibold text-[#f2f2ee]">
      {text}
      {optional && <span className="ml-1 font-normal text-neutral-400">(optional)</span>}
    </label>
  );

  return (
    <section className="py-[var(--spacing-section)]" id="contact">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" onLoad={mountCaptcha} onReady={mountCaptcha} />
      <div className="mx-auto w-full max-w-[var(--layout-max)] px-[var(--layout-pad)]">
        <div className="grid gap-10 rounded-[var(--radius-2xl)] bg-accent-500 p-8 text-on-accent sm:p-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:p-16">
          <div>
            {props.heading && <h2 className="font-heading text-[clamp(2rem,1rem+3vw,3.75rem)] font-extrabold leading-[0.95] tracking-tight !text-[#0b0b0c] [overflow-wrap:break-word]">{props.heading}</h2>}
            {props.body && <p className="mt-6 max-w-md text-body-lg !text-[#0b0b0c]/80">{props.body}</p>}
            {props.email && (
              <p className="mt-6">
                <a href={`mailto:${props.email}`} className="font-bold text-[#0b0b0c] underline underline-offset-4">
                  {props.email}
                </a>
              </p>
            )}
          </div>

          <div className="rounded-[var(--radius-xl)] bg-[#0b0b0c] p-6 text-[#f2f2ee] sm:p-8">
            {state === "sent" ? (
              <div role="status" className="py-10 text-center">
                <p className="font-heading text-h3 font-extrabold text-[#f2f2ee]">{props.successMessage}</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    {label("Name", "inq-name")}
                    <input id="inq-name" className={fieldClass} value={values.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "inq-name-err" : undefined} />
                    {errors.name && <p id="inq-name-err" className="mt-1 text-body-sm text-error-500">{errors.name}</p>}
                  </div>
                  <div>
                    {label("Email", "inq-email")}
                    <input id="inq-email" type="email" className={fieldClass} value={values.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "inq-email-err" : undefined} />
                    {errors.email && <p id="inq-email-err" className="mt-1 text-body-sm text-error-500">{errors.email}</p>}
                  </div>
                </div>

                {(props.showPhone || props.showCompany) && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {props.showPhone && (
                      <div>
                        {label("Phone / WhatsApp", "inq-phone", true)}
                        <input id="inq-phone" type="tel" className={fieldClass} value={values.phone} onChange={set("phone")} autoComplete="tel" />
                      </div>
                    )}
                    {props.showCompany && (
                      <div>
                        {label("Company", "inq-company", true)}
                        <input id="inq-company" className={fieldClass} value={values.company} onChange={set("company")} autoComplete="organization" />
                      </div>
                    )}
                  </div>
                )}

                {props.showService && props.serviceOptions.length > 0 && (
                  <div>
                    {label("Service", "inq-service", true)}
                    <select id="inq-service" className={fieldClass} value={values.service} onChange={set("service")}>
                      <option value="">Select a service</option>
                      {props.serviceOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {props.showBudget && props.budgetOptions.length > 0 && (
                  <fieldset>
                    <legend className="mb-1.5 text-body-sm font-semibold text-[#f2f2ee]">
                      Budget <span className="font-normal text-neutral-400">(optional)</span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {props.budgetOptions.map((b) => {
                        const on = values.budget === b;
                        return (
                          <button
                            key={b}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setValues((v) => ({ ...v, budget: on ? "" : b }))}
                            className={cn(
                              "rounded-full border px-4 py-2 text-body-sm font-semibold transition-colors",
                              on ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-300 text-[#f2f2ee] hover:border-accent-500",
                            )}
                          >
                            {b}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                <div>
                  {label("Project details", "inq-message")}
                  <textarea id="inq-message" rows={4} className={cn(fieldClass, "resize-y")} value={values.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "inq-message-err" : undefined} />
                  {errors.message && <p id="inq-message-err" className="mt-1 text-body-sm text-error-500">{errors.message}</p>}
                </div>

                {/* Honeypot: invisible to people, irresistible to bots. */}
                <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
                  </label>
                </div>

                {props.turnstileSiteKey && <div ref={captchaRef} />}

                {state === "failed" && (
                  <p role="alert" className="text-body-sm text-error-500">
                    {serverError || props.errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state === "sending"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-4 font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {state === "sending" ? "Sending…" : props.submitLabel}
                  <span aria-hidden>&rarr;</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
