"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RichTextEditor,
  toast,
} from "@agency/ui";
import { Braces } from "lucide-react";
import { request } from "@/lib/api";
import type { EmailTemplate } from "./types";

// {{cta}} isn't a plain data placeholder like the rest -- it's replaced at
// send time with a styled button built from a live URL (see
// apps/api/src/lib/email-templates.ts), so it gets its own explanation
// rather than being listed as just another token.
const VARIABLE_HINTS: Record<string, string> = {
  cta: "Inserts the call-to-action button — move it or remove it, but don't type inside it.",
};

// Friendly names so nobody has to remember the codes.
const VARIABLE_LABELS: Record<string, string> = {
  name: "Recipient name",
  email: "Email address",
  bookingNumber: "Booking number",
  payoutNumber: "Payout number",
  campaignName: "Campaign name",
  influencerName: "Influencer name",
  clientName: "Client name",
  amount: "Amount",
  code: "Login code",
  otp: "Login code",
  link: "Link",
  url: "Link",
  message: "Message",
  reason: "Reason",
  cta: "Action button",
};
const humanize = (t: string) => VARIABLE_LABELS[t] ?? t.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

function PlaceholderPicker({ tokens, onPick, label }: { tokens: string[]; onPick: (token: string) => void; label: string }) {
  const [open, setOpen] = React.useState(false);
  if (tokens.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-[12px] font-bold text-accent-500 transition-colors hover:border-accent-500">
          <Braces className="size-3" aria-hidden /> {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        <p className="px-2.5 py-1.5 text-label text-neutral-500">Pick one — it is filled in automatically when the email is sent.</p>
        <ul className="max-h-64 overflow-y-auto">
          {tokens.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => {
                  onPick(t);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-[8px] px-2.5 py-2 text-left hover:bg-neutral-100"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-heading">{humanize(t)}</span>
                  {VARIABLE_HINTS[t] && <span className="block text-label text-neutral-500">{VARIABLE_HINTS[t]}</span>}
                </span>
                <code className="shrink-0 text-label text-neutral-500">{`{{${t}}}`}</code>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function EmailTemplateDialog({
  template,
  onOpenChange,
  onSaved,
}: {
  template: EmailTemplate | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: EmailTemplate) => void;
}) {
  const [subject, setSubject] = React.useState("");
  const [bodyHtml, setBodyHtml] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const subjectRef = React.useRef<HTMLInputElement>(null);
  const insertRef = React.useRef<((text: string) => void) | null>(null);

  // Puts the placeholder where the cursor is in the subject (or at its end).
  function insertIntoSubject(token: string) {
    const el = subjectRef.current;
    const text = `{{${token}}}`;
    const start = el?.selectionStart ?? subject.length;
    const end = el?.selectionEnd ?? subject.length;
    setSubject(subject.slice(0, start) + text + subject.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  React.useEffect(() => {
    if (!template) return;
    setSubject(template.subject);
    setBodyHtml(template.bodyHtml);
  }, [template]);

  async function handleSave() {
    if (!template) return;
    if (!subject.trim() || !bodyHtml.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    setSaving(true);
    try {
      const updated = await request<{ item: EmailTemplate }>(`/email-templates/${encodeURIComponent(template.key)}`, {
        method: "PATCH",
        body: JSON.stringify({ subject, bodyHtml }),
      }).then((r) => r.item);
      toast.success("Email template updated");
      onSaved(updated);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle>{template.name}</DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </DialogHeader>

            <div className="mt-2 grid gap-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <Label className="mb-0">Subject</Label>
                  <PlaceholderPicker tokens={template.variables.filter((v) => v !== "cta")} onPick={insertIntoSubject} label="Insert placeholder" />
                </div>
                <Input ref={subjectRef} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <Label className="mb-0">Body</Label>
                  <PlaceholderPicker tokens={template.variables} onPick={(t) => insertRef.current?.(`{{${t}}}`)} label="Insert placeholder" />
                </div>
                <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write the email body…" insertRef={insertRef} />
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
