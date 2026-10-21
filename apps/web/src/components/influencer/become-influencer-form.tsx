"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { ImageUploader, VideoUploader } from "./media-uploaders";
import { RegistrationStepper } from "./registration-stepper";
import { CategoryPicker } from "./category-picker";
import { PayoutMethodIcon } from "./payout-method-icon";
import { PasswordField } from "@/components/password-field";
import {
  Badge,
  Button,
  Checkbox,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RichText,
  SocialIcon,
  Textarea,
  toast,
} from "@agency/ui";
import { CountrySelect } from "@/components/country-select";
import {
  influencerApplicationSchema,
  INFLUENCER_SOCIAL_PLATFORMS,
  REGISTRATION_PAYOUT_METHOD_TYPES,
  REGISTRATION_PAYOUT_METHOD_LABELS,
  PAYOUT_METHOD_FIELDS_BY_TYPE,
  type InfluencerApplicationInput,
  type InfluencerPlatformInput,
  type RegistrationPayoutMethodTypeId,
} from "@agency/types";
import {
  getInfluencerCategories,
  getInfluencerVideoGuideContent,
  signApplicationMediaUpload,
  submitInfluencerApplication,
} from "@/lib/influencer-api";
import { formatCompactNumber, platformIconId, platformLabel } from "@/lib/influencer-format";

const STEPS = ["You", "Your content", "Payout"] as const;

const EMPTY_PLATFORM: InfluencerPlatformInput = {
  platform: "INSTAGRAM",
  handle: "",
  profileUrl: "",
  followers: 0,
  following: 0,
  posts: 0,
  accountReach: 0,
  avgReach: 0,
  avgViews: 0,
  avgLikes: 0,
  avgComments: 0,
  avgShares: 0,
  avgSaves: 0,
  isPrimary: false,
};

// Red star after a label: this field is required.
function Req() {
  return (
    <span className="ml-1 text-error-500" aria-hidden>
      *
    </span>
  );
}

function Need({ show, children = "Required" }: { show: boolean; children?: React.ReactNode }) {
  return show ? <p className="mt-1 text-body-sm text-error-500">{children}</p> : null;
}

type FormState = Omit<InfluencerApplicationInput, "termsAccepted"> & { termsAccepted: boolean };

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  username: "",
  tagline: "",
  bio: "",
  countryCode: "",
  city: "",
  languages: [],
  categoryIds: [],
  profilePhoto: null,
  coverImage: null,
  introVideo: null,
  platforms: [],
  payoutMethod: { type: "BANK_ACCOUNT", details: {} },
  termsAccepted: false,
};

export function BecomeInfluencerForm({
  bare = false,
  onSwitchToLogin,
}: {
  bare?: boolean;
  onSwitchToLogin?: () => void;
} = {}) {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]);
  const [showVideoGuide, setShowVideoGuide] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);
  // Set when someone presses Continue with missing fields: the empty required ones then show a red note.
  const [tried, setTried] = React.useState<number | null>(null);
  const [videoGuideContent, setVideoGuideContent] = React.useState("");
  const [platformDraft, setPlatformDraft] = React.useState<InfluencerPlatformInput>(EMPTY_PLATFORM);
  const [editingPlatformIndex, setEditingPlatformIndex] = React.useState<number | null>(null);
  const sessionId = React.useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s${Date.now()}${Math.random()}`,
  );

  React.useEffect(() => {
    getInfluencerCategories().then(setCategories).catch(() => {});
    getInfluencerVideoGuideContent().then(setVideoGuideContent).catch(() => {});
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function stepIsValid(index: number): boolean {
    if (index === 0) return form.name.length >= 2 && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8 && form.username.length >= 3;
    if (index === 1) return form.categoryIds.length > 0 && form.platforms.length > 0;
    return true;
  }

  function goNext() {
    if (!stepIsValid(step)) {
      setTried(step);
      toast.error("Please fill in the fields marked * before continuing.");
      return;
    }
    setTried(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function resetPlatformDraft() {
    setPlatformDraft(EMPTY_PLATFORM);
    setEditingPlatformIndex(null);
  }

  function handleAddOrUpdatePlatform() {
    if (!platformDraft.handle) {
      toast.error("Enter a profile username before adding this platform.");
      return;
    }
    if (editingPlatformIndex !== null) {
      set(
        "platforms",
        form.platforms.map((p, idx) => (idx === editingPlatformIndex ? platformDraft : p)),
      );
    } else {
      set("platforms", [...form.platforms, { ...platformDraft, isPrimary: form.platforms.length === 0 }]);
    }
    resetPlatformDraft();
  }

  function handleEditPlatform(index: number) {
    setPlatformDraft(form.platforms[index]!);
    setEditingPlatformIndex(index);
  }

  function handleDeletePlatform(index: number) {
    const wasPrimary = form.platforms[index]?.isPrimary;
    const next = form.platforms.filter((_, idx) => idx !== index);
    if (wasPrimary && next.length > 0) next[0] = { ...next[0]!, isPrimary: true };
    set("platforms", next);
    if (editingPlatformIndex === index) resetPlatformDraft();
  }

  function updatePayoutDetail(key: string, value: string) {
    set("payoutMethod", { ...form.payoutMethod, details: { ...form.payoutMethod.details, [key]: value } });
  }

  async function handleSubmit() {
    const parsed = influencerApplicationSchema.safeParse(form);
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
      await submitInfluencerApplication(parsed.data);
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={cn(!bare && "rounded-2xl border border-neutral-200 p-8", "text-center")}>
        <Badge variant="success">Application submitted</Badge>
        <p className="mt-4 text-body text-neutral-600">
          Thanks for applying! Our team reviews every application by hand — we'll email you as soon as there's an update.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(!bare && "rounded-3xl border border-neutral-200 p-8")}>
      <RegistrationStepper steps={STEPS} currentStep={step} />

      <div key={step} className="animate-[chapter-in_0.35s_ease-out]">
        {/* ---------------------------------------------------------- step 1: you */}
        {step === 0 && (
          <div className="space-y-5">
            <p className="text-body-sm text-neutral-500">Takes about two minutes. We review every application by hand. Fields marked <span className="text-error-500">*</span> are required.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>
                  Full name
                  <Req />
                </Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" aria-invalid={tried === 0 && form.name.length < 2} />
                <Need show={tried === 0 && form.name.length < 2} />
              </div>
              <div>
                <Label>
                  Email
                  <Req />
                </Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" aria-invalid={tried === 0 && !/\S+@\S+\.\S+/.test(form.email)} />
                <Need show={tried === 0 && !/\S+@\S+\.\S+/.test(form.email)}>Enter a valid email address</Need>
              </div>
              <div>
                <Label>
                  Password
                  <Req />
                </Label>
                <PasswordField value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" aria-invalid={tried === 0 && form.password.length < 8} />
                {tried === 0 && form.password.length < 8 ? <Need show>At least 8 characters</Need> : <p className="mt-1.5 text-label text-neutral-500">At least 8 characters.</p>}
              </div>
              <div>
                <Label>
                  Username
                  <Req />
                </Label>
                <Input value={form.username} onChange={(e) => set("username", e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="your-profile-name" aria-invalid={tried === 0 && form.username.length < 3} />
                {tried === 0 && form.username.length < 3 ? <Need show>At least 3 characters</Need> : <p className="mt-1.5 truncate text-label text-neutral-500">Your link: /influencers/{form.username || "your-profile-name"}</p>}
              </div>
              <div>
                <Label>Country</Label>
                <CountrySelect value={form.countryCode ?? ""} onChange={(v) => set("countryCode", v)} placeholder="Select country" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------- step 2: content */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label>
                What do you create? (pick one or more)
                <Req />
              </Label>
              <CategoryPicker categories={categories} value={form.categoryIds} onChange={(ids) => set("categoryIds", ids)} />
              <FieldError>{errors.categoryIds}</FieldError>
              <Need show={tried === 1 && form.categoryIds.length === 0}>Pick at least one category</Need>
            </div>

            <div className="space-y-4 rounded-[var(--radius-xl)] border border-neutral-200 p-5">
              <div className="flex items-center justify-between">
                <Label className="mb-0">
                  {editingPlatformIndex !== null ? "Edit platform" : "Add your main platform"}
                  <Req />
                </Label>
                {editingPlatformIndex !== null && (
                  <Button type="button" variant="ghost" size="sm" onClick={resetPlatformDraft}>
                    Cancel
                  </Button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Platform</Label>
                  <Select value={platformDraft.platform} onValueChange={(v) => setPlatformDraft((p) => ({ ...p, platform: v as InfluencerPlatformInput["platform"] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INFLUENCER_SOCIAL_PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    Username
                    <Req />
                  </Label>
                  <Input value={platformDraft.handle ?? ""} onChange={(e) => setPlatformDraft((p) => ({ ...p, handle: e.target.value }))} />
                </div>
                <div>
                  <Label>Followers</Label>
                  <Input type="number" value={platformDraft.followers || ""} onChange={(e) => setPlatformDraft((p) => ({ ...p, followers: Number(e.target.value) }))} />
                </div>
              </div>
              <Button type="button" onClick={handleAddOrUpdatePlatform}>
                {editingPlatformIndex !== null ? "Save changes" : "Add platform"}
              </Button>
            </div>

            {form.platforms.length > 0 ? (
              <div className="space-y-3">
                {form.platforms.map((p, i) => {
                  const iconId = platformIconId(p.platform);
                  return (
                    <div key={i} className="animate-[chapter-in_0.3s_ease-out] flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-neutral-200 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {iconId ? <SocialIcon platform={iconId} className="size-6 shrink-0" /> : null}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium text-heading">
                            {platformLabel(p.platform)}
                            {p.isPrimary && <Badge variant="accent">Primary</Badge>}
                          </p>
                          <p className="truncate text-body-sm text-neutral-500">
                            @{p.handle || "—"} · {formatCompactNumber(p.followers)} followers
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label="Edit platform" onClick={() => handleEditPlatform(i)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Delete platform" onClick={() => handleDeletePlatform(i)}>
                          <Trash2 className="size-4 text-error-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={tried === 1 ? "text-body-sm font-semibold text-error-500" : "text-body-sm text-neutral-500"}>Add at least one platform above (required). You can add your detailed stats later from your dashboard.</p>
            )}
            <FieldError>{errors.platforms}</FieldError>

            <button type="button" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="text-body-sm font-bold text-accent-500 hover:underline">
              {showMore ? "Hide extra details" : "Add more about you (optional)"}
            </button>
            {showMore && (
              <div className="animate-[chapter-in_0.3s_ease-out] space-y-5">
                <div>
                  <Label>Tagline</Label>
                  <Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Lifestyle & travel creator" />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} rows={3} />
                </div>
                <ImageUploader
                  label="Profile image"
                  helpText="JPG, PNG, or WEBP, up to 10MB."
                  sign={() => signApplicationMediaUpload(sessionId.current)}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  acceptedExtensions={["jpg", "jpeg", "png", "webp"]}
                  maxSizeMB={10}
                  value={form.profilePhoto}
                  onChange={(media) => set("profilePhoto", media)}
                />
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Introduction video</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowVideoGuide(true)}>
                      Video Guide
                    </Button>
                  </div>
                  <VideoUploader sign={() => signApplicationMediaUpload(sessionId.current)} value={form.introVideo} onChange={(media) => set("introVideo", media)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- step 3: payout */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <Label>
                How would you like to be paid?
                <Req />
              </Label>
              <Select value={form.payoutMethod.type} onValueChange={(v) => set("payoutMethod", { type: v as RegistrationPayoutMethodTypeId, details: {} })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRATION_PAYOUT_METHOD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2.5">
                        <PayoutMethodIcon type={t} size={6} />
                        {REGISTRATION_PAYOUT_METHOD_LABELS[t]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div key={form.payoutMethod.type} className="grid animate-[chapter-in_0.3s_ease-out] gap-4 sm:grid-cols-2">
              {PAYOUT_METHOD_FIELDS_BY_TYPE[form.payoutMethod.type].map((field) => (
                <div key={field.key}>
                  <Label>
                    {field.label}
                    {!/optional/i.test(field.label) && <Req />}
                  </Label>
                  <Input value={form.payoutMethod.details[field.key] ?? ""} onChange={(e) => updatePayoutDetail(field.key, e.target.value)} />
                </div>
              ))}
            </div>
            <FieldError>{errors.payoutMethod}</FieldError>

            <p className="text-body-sm text-neutral-500">Your payout details are kept on file and are not active until your application is approved.</p>

            <div className="flex items-start gap-3">
              <Checkbox checked={form.termsAccepted} onCheckedChange={(c) => set("termsAccepted", c === true)} id="terms" />
              <Label htmlFor="terms" className="font-normal">
                I confirm the information above is accurate and I agree to the{" "}
                <Link href="/influencer/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-500 hover:underline">
                  Influencer Terms &amp; Conditions
                </Link>{" "}
                and the{" "}
                <Link href="/influencer/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-500 hover:underline">
                  Privacy Policy
                </Link>
                .
                <Req />
              </Label>
            </div>
            <FieldError>{errors.termsAccepted}</FieldError>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        ) : (
          <Button type="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        )}
      </div>

      <p className="mt-6 text-center text-body-sm text-neutral-500">
        Already have an account?{" "}
        {onSwitchToLogin ? (
          <button type="button" onClick={onSwitchToLogin} className="text-accent-600 hover:underline">
            Sign in
          </button>
        ) : (
          <Link href="/influencer/login" scroll={false} className="text-accent-600 hover:underline">
            Sign in
          </Link>
        )}
      </p>

      <VideoGuideModal open={showVideoGuide} onClose={() => setShowVideoGuide(false)} content={videoGuideContent} />
    </div>
  );
}

// Fallback shown before an admin ever saves the influencer_video_guide
// SiteSetting (packages/types/src/settings.ts) -- keeps the modal from
// looking empty/broken in that window rather than requiring a seed change.
const DEFAULT_VIDEO_GUIDE_HTML = `<ol>
<li>Mention your Name</li>
<li>Mention what you are known for</li>
<li>Mention that you have joined the StarBazaar Family</li>
<li>Mention that your fans can now order personalized video shoutouts on StarBazaar.pk to make every occasion special.</li>
<li>Mention that businesses can now order promotional video shoutouts on StarBazaar.pk.</li>
<li>Mention that you are excited to announce your collaboration with StarBazaar.pk.</li>
</ol>
<p><em>Your introduction video may be used for promotional purposes.</em></p>`;

function VideoGuideModal({ open, onClose, content }: { open: boolean; onClose: () => void; content: string }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Follow these steps</DialogTitle>
        </DialogHeader>
        <RichText html={content || DEFAULT_VIDEO_GUIDE_HTML} />
      </DialogContent>
    </Dialog>
  );
}
