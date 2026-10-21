"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@agency/ui";
import { getInfluencerMe } from "@/lib/influencer-api";
import { submitContactForm } from "@/lib/api";

const TOPICS = ["Finding my analytics", "Bookings", "Payments and payouts", "My profile", "Something else"];

// "Contact support" opens this form instead of leaving the dashboard. It arrives in Admin > Messages.
export function SupportButton({ variant = "outline", className, children = "Contact support" }: { variant?: "outline" | "primary"; className?: string; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [topic, setTopic] = React.useState(TOPICS[0]!);
  const [message, setMessage] = React.useState("");
  const [where, setWhere] = React.useState({ country: "", city: "", username: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  // Their details are already known, so they only write the question.
  React.useEffect(() => {
    if (!open || name) return;
    getInfluencerMe()
      .then((me) => {
        setName(me.name);
        setEmail(me.email);
        setWhere({ country: me.profile?.countryCode ?? "", city: me.profile?.city ?? "", username: me.profile?.username ?? "" });
      })
      .catch(() => undefined);
  }, [open, name]);

  React.useEffect(() => {
    if (open) {
      setDone(false);
      setErrors({});
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (name.trim().length < 2) err.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) err.email = "Enter a valid email address";
    if (phone.trim().length < 5) err.phone = "Enter a phone or WhatsApp number";
    if (message.trim().length < 10) err.message = "Please write at least a short sentence";
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      await submitContactForm({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: where.country || "Not set",
        city: where.city || "Not set",
        message: `Topic: ${topic}${where.username ? `\nCreator profile: /influencers/${where.username}` : ""}\n\n${message.trim()}`,
        source: "influencer-support",
      });
      setDone(true);
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-h-[92vh] w-full max-w-xl overflow-y-auto p-0">
          {done ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <CheckCircle2 className="size-12 text-accent-500" aria-hidden />
              <DialogTitle className="mt-4">Message sent</DialogTitle>
              <DialogDescription className="mt-2 max-w-sm">Thank you. Our team will get back to you on {email || "your email"} as soon as possible.</DialogDescription>
              <Button className="mt-6" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <DialogHeader className="mb-0 border-b border-neutral-200 px-6 py-4">
                <DialogTitle>Contact support</DialogTitle>
                <DialogDescription>Tell us what you need help with. We will reply by email.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="support-name">Name</Label>
                    <Input id="support-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
                    {errors.name && <p className="mt-1 text-body-sm text-error-500">{errors.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="support-email">Email</Label>
                    <Input id="support-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
                    {errors.email && <p className="mt-1 text-body-sm text-error-500">{errors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="support-phone">Phone / WhatsApp</Label>
                    <Input id="support-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" aria-invalid={!!errors.phone} />
                    {errors.phone && <p className="mt-1 text-body-sm text-error-500">{errors.phone}</p>}
                  </div>
                  <div>
                    <Label>What is it about?</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOPICS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="support-message">Your message</Label>
                  <Textarea id="support-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Which platform or number are you stuck on?" aria-invalid={!!errors.message} />
                  {errors.message && <p className="mt-1 text-body-sm text-error-500">{errors.message}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-neutral-200 px-6 py-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />} {busy ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
