import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-label uppercase tracking-wide",
  {
    variants: {
      variant: {
        neutral: "border-neutral-200 bg-neutral-50 text-neutral-600",
        accent: "border-accent-200 bg-accent-50 text-accent-700",
        success: "border-success-500/20 bg-success-50 text-success-700",
        warning: "border-warning-500/20 bg-warning-50 text-warning-700",
        error: "border-error-500/20 bg-error-50 text-error-700",
        dark: "border-transparent bg-heading text-background",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
