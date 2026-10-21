import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/cn";

export const badgeVariants = cva(
  // Compact status label: bold sans text on a soft tint of its colour (no outline, no monospace).
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.06em] [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-neutral-100 text-neutral-600",
        accent: "bg-accent-500/15 text-accent-500",
        success: "bg-success-500/15 text-success-700",
        warning: "bg-warning-500/15 text-warning-700",
        error: "bg-error-500/15 text-error-700",
        dark: "bg-heading text-background",
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
