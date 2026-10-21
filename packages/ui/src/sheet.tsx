"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./lib/cn";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

// Radix keeps the panel mounted until its CSS *animation* finishes (a transition is not enough), so open and close
// both use keyframes (see noir.css): the panel slides in/out and the dimmed backdrop fades with it.
const sideClasses = {
  left: "inset-y-0 left-0 h-dvh w-72 data-[state=open]:animate-[drawer-in_0.34s_cubic-bezier(0.22,1,0.36,1)_both] data-[state=closed]:animate-[drawer-out_0.26s_cubic-bezier(0.4,0,1,1)_both]",
  right: "inset-y-0 right-0 h-dvh w-72 data-[state=open]:animate-[drawer-in-right_0.34s_cubic-bezier(0.22,1,0.36,1)_both] data-[state=closed]:animate-[drawer-out-right_0.26s_cubic-bezier(0.4,0,1,1)_both]",
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
          "fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm",
          "data-[state=open]:animate-[overlay-in_0.3s_ease-out_both] data-[state=closed]:animate-[overlay-out_0.26s_ease-in_both]",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-40 flex flex-col border-neutral-200 bg-background shadow-soft-xl focus:outline-none",
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
