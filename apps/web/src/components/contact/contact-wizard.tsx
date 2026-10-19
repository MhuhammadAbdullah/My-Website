"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { contactSubmissionSchema, type ContactSubmissionInput, type ContactPageSettings } from "@agency/types";
import { CountrySelect } from "@/components/country-select";
import { FieldError, Heading, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, cn, toast } from "@agency/ui";
import { submitContactForm } from "@/lib/api";
import { trackContactFormConversion } from "@/lib/tracking-events";

function Chips({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (o: string) => void }) {
  return (
    <div
      className={cn(
        "mt-4 grid auto-cols-max grid-flow-col justify-items-start gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        options.length > 4 ? "grid-rows-2" : "grid-rows-1",
        "sm:mt-5 sm:flex sm:flex-wrap sm:gap-2.5 sm:overflow-visible sm:pb-0",
      )}
    >
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={cn("whitespace-nowrap rounded-full border px-4 py-2 text-label font-semibold transition-colors sm:px-5 sm:py-2.5 sm:text-body-sm", on ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-200 text-heading hover:border-accent-500")}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// "Start a project": 3 steps (type -> budget & timeline -> details). Choices are written into the
// message so they arrive with the lead in Messages.
export function ContactWizard({ form: cfg }: { form: ContactPageSettings["form"] }) {
  const [step, setStep] = React.useState(0);
  const [types, setTypes] = React.useState<string[]>([]);
  const [budget, setBudget] = React.useState<string[]>([]);
  const [timeline, setTimeline] = React.useState<string[]>([]);
  const [hint, setHint] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactSubmissionInput>({ resolver: zodResolver(contactSubmissionSchema), defaultValues: { country: "", city: "" } });

  // Links from the Influencer Marketplace arrive with ?type=...&creators=...
  const params = useSearchParams();
  React.useEffect(() => {
    const type = params.get("type");
    const creators = params.get("creators");
    if (type && cfg.types.includes(type)) setTypes([type]);
    if (creators) setValue("message", `I'd like quotes for these creators: ${creators}.
`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (list: string[], set: (v: string[]) => void, o: string) => set(list.includes(o) ? list.filter((x) => x !== o) : [...list, o]);
  const single = (set: (v: string[]) => void) => (o: string) => set([o]);

  function next() {
    if (step === 0 && types.length === 0) return setHint(cfg.pickOne);
    setHint("");
    setStep((s) => Math.min(2, s + 1));
  }

  async function onSubmit(data: ContactSubmissionInput) {
    const lines = [
      types.length ? `Project type: ${types.join(", ")}` : "",
      budget[0] ? `Budget: ${budget[0]}` : "",
      timeline[0] ? `Timeline: ${timeline[0]}` : "",
    ].filter(Boolean);
    const message = [...lines, ...(lines.length ? [""] : []), data.message].join("\n");
    try {
      await submitContactForm({ ...data, message, source: "contact-page" });
      toast.success(cfg.success);
      trackContactFormConversion();
      reset();
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  const steps = cfg.steps.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-8 rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50 p-5 sm:p-10 lg:grid-cols-[17rem_1fr] lg:gap-14">
      <div className="min-w-0">
        <Heading level={2} style={{ fontSize: "clamp(1.75rem, 1rem + 2vw, 2.75rem)" }}>
          {cfg.heading}
        </Heading>
        <p className="mt-4 text-body-sm text-neutral-500">{cfg.intro}</p>
        <ol className="mt-5 flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mt-8 lg:block lg:overflow-visible lg:border-t lg:border-neutral-200">
          {steps.map((label, i) => (
            <li key={i} className="shrink-0 lg:border-b lg:border-neutral-200">
              <button type="button" disabled={i > step} onClick={() => setStep(i)} className="flex w-full items-center gap-2 whitespace-nowrap rounded-full py-2 pl-1 pr-3 text-left text-label lg:gap-3 lg:rounded-none lg:py-3 lg:pl-0 lg:pr-0 lg:text-body-sm">
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-label font-bold", i === step ? "border-accent-500 bg-accent-500 text-on-accent" : i < step ? "border-accent-500 text-accent-500" : "border-neutral-300 text-neutral-500")}>
                  {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                <span className={i === step ? "font-semibold text-heading" : "text-neutral-500"}>{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="min-w-0">
        <div className="flex gap-2" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-accent-500" : "bg-neutral-200")} />
          ))}
        </div>

        {sent ? (
          <div role="status" className="mt-10">
            <p className="font-heading text-h3 font-extrabold text-heading">{cfg.success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8">
            {step === 0 && (
              <div key="s0" className="animate-[chapter-in_0.3s_ease-out]">
                <h3 className="font-heading text-h4 font-extrabold text-heading">{cfg.typeQuestion}</h3>
                <Chips options={cfg.types} value={types} onToggle={(o) => toggle(types, setTypes, o)} />
                {hint && (
                  <p role="alert" className="mt-4 text-body-sm text-error-500">
                    {hint}
                  </p>
                )}
              </div>
            )}

            {step === 1 && (
              <div key="s1" className="animate-[chapter-in_0.3s_ease-out]">
                <h3 className="font-heading text-h4 font-extrabold text-heading">{cfg.budgetQuestion}</h3>
                <Chips options={cfg.budgets} value={budget} onToggle={single(setBudget)} />
                <h3 className="mt-8 font-heading text-h4 font-extrabold text-heading">{cfg.timelineQuestion}</h3>
                <Chips options={cfg.timelines} value={timeline} onToggle={single(setTimeline)} />
              </div>
            )}

            {step === 2 && (
              <div key="s2" className="animate-[chapter-in_0.3s_ease-out] space-y-5">
                <h3 className="font-heading text-h4 font-extrabold text-heading">{cfg.detailsQuestion}</h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...register("name")} aria-invalid={!!errors.name} placeholder="Enter your full name" />
                    <FieldError>{errors.name?.message}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} placeholder="Enter your email address" />
                    <FieldError>{errors.email?.message}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register("phone")} aria-invalid={!!errors.phone} placeholder="Enter your phone number" />
                    <FieldError>{errors.phone?.message}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="companyName">Company name (optional)</Label>
                    <Input id="companyName" {...register("companyName")} placeholder="Enter your company name" />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Controller
                      control={control}
                      name="country"
                      render={({ field }) => (
                        <CountrySelect value={field.value} onChange={field.onChange} />
                      )}
                    />
                    <FieldError>{errors.country?.message}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register("city")} aria-invalid={!!errors.city} placeholder="Enter your city" />
                    <FieldError>{errors.city?.message}</FieldError>
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">Tell us about your project</Label>
                  <Textarea id="message" {...register("message")} aria-invalid={!!errors.message} placeholder="Describe what you're building, your goals, and your timeline…" />
                  <FieldError>{errors.message?.message}</FieldError>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-4">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-2.5 text-body-sm font-semibold text-heading hover:border-accent-500">
                  <ArrowLeft className="size-4" aria-hidden /> {cfg.back}
                </button>
              ) : (
                <span />
              )}
              {step < 2 ? (
                <button key="next" type="button" onClick={next} className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-body-sm font-bold text-on-accent hover:opacity-90">
                  {cfg.next} <ArrowRight className="size-4" aria-hidden />
                </button>
              ) : (
                <button key="submit" type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-body-sm font-bold text-on-accent hover:opacity-90 disabled:opacity-60">
                  {isSubmitting ? "Sending…" : cfg.submit} <ArrowRight className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
