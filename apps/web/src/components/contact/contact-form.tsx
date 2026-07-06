"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSubmissionSchema, type ContactSubmissionInput } from "@agency/types";
import { COUNTRIES } from "@agency/utils";
import {
  Button,
  Input,
  Textarea,
  Label,
  FieldError,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@agency/ui";
import { submitContactForm } from "@/lib/api";

export function ContactForm() {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactSubmissionInput>({
    resolver: zodResolver(contactSubmissionSchema),
    defaultValues: { country: "", city: "" },
  });

  async function onSubmit(data: ContactSubmissionInput) {
    try {
      await submitContactForm({ ...data, source: "contact-page" });
      toast.success("Message sent — we'll reply within one business day.");
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} aria-invalid={!!errors.name} placeholder="Jane Cooper" />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} placeholder="jane@company.com" />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} aria-invalid={!!errors.phone} placeholder="+1 (555) 000-0000" />
          <FieldError>{errors.phone?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="budget">Budget (optional)</Label>
          <Input id="budget" {...register("budget")} placeholder="$5,000 – $15,000" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="country">Country</Label>
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="country" aria-invalid={!!errors.country}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError>{errors.country?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} aria-invalid={!!errors.city} placeholder="San Francisco" />
          <FieldError>{errors.city?.message}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="message">Project details</Label>
        <Textarea
          id="message"
          {...register("message")}
          aria-invalid={!!errors.message}
          placeholder="Tell us what you're building and what timeline you're working with…"
        />
        <FieldError>{errors.message?.message}</FieldError>
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
