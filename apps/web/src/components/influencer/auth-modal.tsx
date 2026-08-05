"use client";

import * as React from "react";
import { Dialog, DialogContent, cn } from "@agency/ui";

// Low-level shell only -- always open while mounted, and delegates the
// actual "what happens on close" decision entirely to the caller via
// onRequestClose (X, Escape, and backdrop-click all funnel through it).
// See auth-modal-provider.tsx and auth-page-client.tsx for the two callers.
export function InfluencerAuthModal({
  children,
  onRequestClose,
  className,
}: {
  children: React.ReactNode;
  onRequestClose: () => void;
  className?: string;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onRequestClose();
      }}
    >
      <DialogContent className={cn("max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto", className)}>
        {children}
      </DialogContent>
    </Dialog>
  );
}
