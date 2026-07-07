"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./lib/cn";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sideClasses = {
  left: "inset-y-0 left-0 h-dvh w-72 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
  right: "inset-y-0 right-0 h-dvh w-72 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0",
};

export function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: "left" | "right";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm transition-opacity duration-300",
          "data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-40 flex flex-col border-neutral-200 bg-background shadow-soft-xl transition-transform duration-300 ease-[var(--ease-premium)] focus:outline-none",
          side === "left" ? "border-r" : "border-l",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-h4 font-semibold text-heading", className)} {...props} />;
}
