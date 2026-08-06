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
  RichTextEditor,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import type { EmailTemplate } from "./types";

// {{cta}} isn't a plain data placeholder like the rest -- it's replaced at
// send time with a styled button built from a live URL (see
// apps/api/src/lib/email-templates.ts), so it gets its own explanation
// rather than being listed as just another token.
const VARIABLE_HINTS: Record<string, string> = {
  cta: "Inserts the call-to-action button — move it or remove it, but don't type inside it.",
};

function VariableChip({ token }: { token: string }) {
  function copy() {
    navigator.clipboard.writeText(`{{${token}}}`).then(() => toast.success(`Copied {{${token}}}`));
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={VARIABLE_HINTS[token] ?? `Click to copy {{${token}}}`}
      className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-label text-neutral-600 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700"
    >
      {`{{${token}}}`}
    </button>
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
      <DialogContent className="max-w-3xl">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle>{template.name}</DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </DialogHeader>

            <div className="mt-2 grid gap-5">
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <Label>Body</Label>
                  <span className="text-body-sm text-neutral-400">Available placeholders below</span>
                </div>
                <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write the email body…" />
              </div>

              {template.variables.length > 0 && (
                <div>
                  <p className="text-body-sm font-medium text-heading">Placeholders</p>
                  <p className="mt-1 text-body-sm text-neutral-500">
                    Click to copy. Use these in the subject or body — they're filled in automatically when the email is sent.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {template.variables.map((v) => (
                      <VariableChip key={v} token={v} />
                    ))}
                  </div>
                </div>
              )}
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
