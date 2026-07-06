import * as React from "react";
import { cn } from "./lib/cn";

export const fieldBaseClass =
  "w-full rounded-xl border border-neutral-200 bg-background px-4 py-2.5 text-body text-heading placeholder:text-neutral-400 transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error-500 aria-invalid:ring-error-500/30";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldBaseClass, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 5, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(fieldBaseClass, "resize-y", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-body-sm font-medium text-heading", className)}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-body-sm text-error-500">{children}</p>;
}
