"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@agency/ui";

// Password input with a show/hide button. Works with react-hook-form's register() too (forwards the ref).
export const PasswordField = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<typeof Input>, "type">>(function PasswordField({ className, ...props }, ref) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input ref={ref} {...props} type={visible ? "text" : "password"} className={`pr-12 ${className ?? ""}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-heading"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
});
