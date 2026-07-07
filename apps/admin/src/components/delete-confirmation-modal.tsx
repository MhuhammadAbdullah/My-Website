"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@agency/ui";

export interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  title = "Delete item?",
  description = "Are you sure you want to delete this item?\n\nThis action cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
}: DeleteConfirmationModalProps) {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setDeleting(false);
      setError(null);
    }
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (deleting) return;
    onOpenChange(next);
  }

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-sm"
        onEscapeKeyDown={(e) => deleting && e.preventDefault()}
        onPointerDownOutside={(e) => deleting && e.preventDefault()}
        onInteractOutside={(e) => deleting && e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-full bg-error-50 text-error-600">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="mt-3">{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">{description}</DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="rounded-xl bg-error-50 px-3 py-2 text-body-sm text-error-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="bg-error-500 text-white hover:bg-error-600"
          >
            {deleting ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
