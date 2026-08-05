"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  FieldError,
  Heading,
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
import { CAMPAIGN_TYPES, bookingSubmissionSchema, type BookingSubmissionInput } from "@agency/types";
import { signBookingMediaUpload, submitBooking, uploadRawFileToCloudinary, type UploadedRawMedia } from "@/lib/influencer-api";
import type { InfluencerPricingCardRead } from "@/lib/influencer-types";

const EMPTY_FORM: BookingSubmissionInput = {
  businessName: "",
  businessWebsite: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  campaignObjective: "",
  industry: "",
  product: "",
  campaignType: CAMPAIGN_TYPES[0],
  targetAudience: "",
  pricingCardId: "",
  discountCode: "",
  timeline: "",
  notes: "",
  attachments: [],
  termsAccepted: false,
};

function packageLabel(card: InfluencerPricingCardRead) {
  const price = card.isCustomQuote ? "Custom Quote" : `${card.currency ?? ""} ${Number(card.price).toLocaleString()}`.trim();
  return `${card.title} — ${price}`;
}

export function BookingForm({
  username,
  pricingCards,
  bare = false,
}: {
  username: string;
  pricingCards: InfluencerPricingCardRead[];
  /** Drop the outer border/padding — used when the form is already inside a Dialog. */
  bare?: boolean;
}) {
  const [form, setForm] = React.useState<BookingSubmissionInput>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [bookingNumber, setBookingNumber] = React.useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = React.useState<number>(0);
  const [uploading, setUploading] = React.useState(false);
  const sessionId = React.useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s${Date.now()}${Math.random()}`,
  );

  function set<K extends keyof BookingSubmissionInput>(key: K, value: BookingSubmissionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleAttachment(file: File | undefined) {
    if (!file) return;
    if (form.attachments.length >= 5) {
      toast.error("Up to 5 attachments allowed.");
      return;
    }
    setUploading(true);
    try {
      const signed = await signBookingMediaUpload(sessionId.current);
      const media: UploadedRawMedia = await uploadRawFileToCloudinary(file, signed);
      set("attachments", [...form.attachments, media]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = bookingSubmissionSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        nextErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(nextErrors);
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form for errors.");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result = await submitBooking(username, parsed.data);
      setBookingNumber(result.bookingNumber);
      setAppliedDiscount(result.discountAmount);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (bookingNumber) {
    const Wrapper = bare ? "div" : Card;
    return (
      <Wrapper className={bare ? "text-center" : "p-8 text-center"}>
        <Badge variant="success">Booking submitted</Badge>
        <Heading level={3} className="mt-4">
          Thanks — we've received your request
        </Heading>
        <p className="mt-3 text-body text-neutral-600">
          Reference <strong>{bookingNumber}</strong>. Our team reviews every request by hand and will reach out at{" "}
          <strong>{form.contactEmail}</strong> with next steps.
        </p>
        {appliedDiscount > 0 && (
          <p className="mt-3 text-body-sm font-medium text-success-600">
            A discount of {appliedDiscount.toLocaleString()} has been applied to your booking.
          </p>
        )}
      </Wrapper>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={bare ? "space-y-8" : "space-y-8 rounded-3xl border border-neutral-200 p-8"}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Business name</Label>
          <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
          <FieldError>{errors.businessName}</FieldError>
        </div>
        <div>
          <Label>Business website</Label>
          <Input value={form.businessWebsite} onChange={(e) => set("businessWebsite", e.target.value)} placeholder="https://" />
          <FieldError>{errors.businessWebsite}</FieldError>
        </div>
        <div>
          <Label>Contact person</Label>
          <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
          <FieldError>{errors.contactPerson}</FieldError>
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          <FieldError>{errors.contactEmail}</FieldError>
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          <FieldError>{errors.contactPhone}</FieldError>
        </div>
        <div>
          <Label>Industry</Label>
          <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} />
          <FieldError>{errors.industry}</FieldError>
        </div>
        <div>
          <Label>Product / service</Label>
          <Input value={form.product} onChange={(e) => set("product", e.target.value)} />
          <FieldError>{errors.product}</FieldError>
        </div>
        <div>
          <Label>Package</Label>
          {pricingCards.length === 0 ? (
            <p className="mt-1.5 text-body-sm text-neutral-500">This influencer hasn't set up any packages yet.</p>
          ) : (
            <Select value={form.pricingCardId} onValueChange={(v) => set("pricingCardId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {pricingCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {packageLabel(card)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FieldError>{errors.pricingCardId}</FieldError>
        </div>
        <div>
          <Label>Campaign type</Label>
          <Select value={form.campaignType} onValueChange={(v) => set("campaignType", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Timeline</Label>
          <Input value={form.timeline} onChange={(e) => set("timeline", e.target.value)} placeholder="e.g. Within 2 weeks" />
          <FieldError>{errors.timeline}</FieldError>
        </div>
      </div>

      <div>
        <Label>Campaign objective</Label>
        <Textarea value={form.campaignObjective} onChange={(e) => set("campaignObjective", e.target.value)} rows={3} />
        <FieldError>{errors.campaignObjective}</FieldError>
      </div>

      <div>
        <Label>Target audience</Label>
        <Textarea value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} rows={3} />
        <FieldError>{errors.targetAudience}</FieldError>
      </div>

      <div>
        <Label>Promo code (optional)</Label>
        <Input
          value={form.discountCode}
          onChange={(e) => set("discountCode", e.target.value.toUpperCase())}
          placeholder="Have a code? Enter it here"
          className="max-w-xs"
        />
        <FieldError>{errors.discountCode}</FieldError>
      </div>

      <div>
        <Label>Notes (optional)</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
      </div>

      <div>
        <Label>Attachments (optional, up to 5)</Label>
        <div className="mt-2 space-y-2">
          {form.attachments.map((a, i) => (
            <div key={a.publicId} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-body-sm">
              <span className="truncate">{a.url.split("/").pop()}</span>
              <button type="button" onClick={() => set("attachments", form.attachments.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <Input
          type="file"
          disabled={uploading || form.attachments.length >= 5}
          onChange={(e) => handleAttachment(e.target.files?.[0])}
          className="mt-2"
        />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox checked={form.termsAccepted} onCheckedChange={(c) => set("termsAccepted", c === true)} id="booking-terms" />
        <Label htmlFor="booking-terms" className="font-normal">
          I agree to the platform's booking terms and confirm the information above is accurate.
        </Label>
      </div>
      <FieldError>{errors.termsAccepted}</FieldError>

      <Button type="submit" size="lg" disabled={submitting || pricingCards.length === 0} className="w-full sm:w-auto">
        {submitting ? "Submitting…" : "Submit booking request"}
      </Button>
    </form>
  );
}
