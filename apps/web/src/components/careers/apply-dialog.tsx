"use client";

import * as React from "react";
import { CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Textarea, cn, toast } from "@agency/ui";
import { CV_MAX_BYTES, submitCareerApplication, uploadCv } from "@/lib/careers-api";

interface FormState {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  linkedin: string;
  portfolio: string;
  experience: string;
  expectedSalary: string;
  noticePeriod: string;
  coverNote: string;
  website: string; // honeypot, hidden from people
}

const EMPTY: FormState = { name: "", email: "", phone: "", country: "", city: "", linkedin: "", portfolio: "", experience: "", expectedSalary: "", noticePeriod: "", coverNote: "", website: "" };

function Field({ label, required, error, className, children }: { label: string; required?: boolean; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label>
        {label}
        {required && <span className="ml-1 text-error-500">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-body-sm text-error-500">{error}</p>}
    </div>
  );
}

export function ApplyDialog({ position, open, onOpenChange }: { position: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [f, setF] = React.useState<FormState>(EMPTY);
  const [cv, setCv] = React.useState<File | null>(null);
  const [consent, setConsent] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  React.useEffect(() => {
    if (!open) return;
    setDone(false);
    setErrors({});
  }, [open]);

  function validate() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Please enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email address";
    if (f.phone.trim().length < 5) e.phone = "Enter a phone number";
    if (f.country.trim().length < 2) e.country = "Enter your country";
    if (f.city.trim().length < 2) e.city = "Enter your city";
    if (!cv) e.cv = "Please attach your CV";
    else if (cv.size > CV_MAX_BYTES) e.cv = "The file is too large. The limit is 5 MB.";
    if (!consent) e.consent = "Please confirm so we can contact you about this application";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate() || !cv) return;
    setBusy(true);
    try {
      const uploaded = await uploadCv(cv);
      await submitCareerApplication({
        position,
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        country: f.country.trim(),
        city: f.city.trim(),
        linkedin: f.linkedin.trim(),
        portfolio: f.portfolio.trim(),
        experience: f.experience.trim(),
        expectedSalary: f.expectedSalary.trim(),
        noticePeriod: f.noticePeriod.trim(),
        coverNote: f.coverNote.trim(),
        cvUrl: uploaded.url,
        cvName: uploaded.name,
        consent: true,
        website: f.website,
      });
      setDone(true);
      setF(EMPTY);
      setCv(null);
      setConsent(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-3xl flex-col p-0">
        {done ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <CheckCircle2 className="size-12 text-accent-500" aria-hidden />
            <DialogTitle className="mt-4">Application received</DialogTitle>
            <DialogDescription className="mt-2 max-w-md">Thank you for applying for {position}. We read every application and will get back to you if there is a fit.</DialogDescription>
            <button type="button" onClick={() => onOpenChange(false)} className="mt-6 rounded-full bg-accent-500 px-6 py-2.5 text-body-sm font-bold text-on-accent hover:opacity-90">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-6 py-4">
              <DialogTitle>Apply for {position}</DialogTitle>
              <DialogDescription>Fields marked * are required. Your details are only used for this application.</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required error={errors.name}>
                  <Input value={f.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} />
                </Field>
                <Field label="Email" required error={errors.email}>
                  <Input type="email" value={f.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} />
                </Field>
                <Field label="Phone / WhatsApp" required error={errors.phone}>
                  <Input type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" aria-invalid={!!errors.phone} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Country" required error={errors.country}>
                    <Input value={f.country} onChange={set("country")} autoComplete="country-name" aria-invalid={!!errors.country} />
                  </Field>
                  <Field label="City" required error={errors.city}>
                    <Input value={f.city} onChange={set("city")} autoComplete="address-level2" aria-invalid={!!errors.city} />
                  </Field>
                </div>
              </div>

              <Field label="CV / Resume" required error={errors.cv}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="sr-only"
                  onChange={(e) => {
                    setCv(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                {cv ? (
                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <FileText className="size-5 shrink-0 text-accent-500" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-semibold text-heading">{cv.name}</span>
                      <span className="block text-label text-neutral-500">{(cv.size / 1024 / 1024).toFixed(2)} MB</span>
                    </span>
                    <button type="button" onClick={() => setCv(null)} aria-label="Remove file" className="flex size-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-accent-500 hover:text-heading">
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={cn("flex w-full flex-col items-center gap-1 rounded-[var(--radius-md)] border border-dashed px-4 py-6 text-center transition-colors hover:border-accent-500", errors.cv ? "border-error-500" : "border-neutral-300")}
                  >
                    <Upload className="size-5 text-neutral-400" aria-hidden />
                    <span className="text-body-sm font-semibold text-heading">Click to upload your CV</span>
                    <span className="text-label text-neutral-500">PDF, DOC or DOCX, up to 5 MB</span>
                  </button>
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="LinkedIn (optional)">
                  <Input value={f.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/in/…" />
                </Field>
                <Field label="Portfolio / website (optional)">
                  <Input value={f.portfolio} onChange={set("portfolio")} placeholder="https://…" />
                </Field>
                <Field label="Years of experience (optional)">
                  <Input value={f.experience} onChange={set("experience")} placeholder="e.g. 3 years" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expected salary (optional)">
                    <Input value={f.expectedSalary} onChange={set("expectedSalary")} />
                  </Field>
                  <Field label="Notice period (optional)">
                    <Input value={f.noticePeriod} onChange={set("noticePeriod")} placeholder="e.g. 1 month" />
                  </Field>
                </div>
              </div>

              <Field label="Cover note (optional)">
                <Textarea rows={4} value={f.coverNote} onChange={set("coverNote")} placeholder="Tell us briefly why you are a good fit." />
              </Field>

              {/* Honeypot: people never see this, bots fill it in. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
                </label>
              </div>

              <div>
                <label className="flex items-start gap-3 text-body-sm text-neutral-500">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
                  <span>I agree that you may store my details and contact me about this application.</span>
                </label>
                {errors.consent && <p className="mt-1 text-body-sm text-error-500">{errors.consent}</p>}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-200 px-6 py-3">
              <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className="rounded-full border border-neutral-300 px-5 py-2.5 text-body-sm font-semibold text-heading hover:border-accent-500 disabled:opacity-60">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-2.5 text-body-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-60">
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {busy ? "Sending…" : "Submit application"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// A button that opens the application form for one position.
export function ApplyButton({ position, className, children }: { position: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <ApplyDialog position={position} open={open} onOpenChange={setOpen} />
    </>
  );
}
