import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-body-sm font-medium transition-colors duration-fast ease-[var(--ease-premium)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-heading text-white hover:bg-neutral-800 shadow-soft-sm",
        accent:
          "bg-accent-500 text-white hover:bg-accent-600 shadow-soft-sm",
        secondary:
          "bg-neutral-100 text-heading hover:bg-neutral-200",
        outline:
          "border border-neutral-300 bg-transparent text-heading hover:bg-neutral-50",
        ghost: "bg-transparent text-heading hover:bg-neutral-100",
        link: "bg-transparent text-accent-600 underline-offset-4 hover:underline p-0",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-6",
        // text-[length:var(--text-body)] (not text-body) deliberately: the
        // bare `text-body` class collides with the --color-body token of the
        // same name, so tailwind-merge treats it as a text-color utility and
        // silently drops the variant's text-white/text-heading in favor of it.
        lg: "h-13 px-8 text-[length:var(--text-body)]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
