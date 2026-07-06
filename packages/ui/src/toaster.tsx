"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-neutral-200 bg-background shadow-soft-lg font-[Manrope]",
          title: "text-heading font-medium",
          description: "text-body",
        },
      }}
    />
  );
}

export { toast } from "sonner";
