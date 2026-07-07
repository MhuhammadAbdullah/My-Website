"use client";

import * as React from "react";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";

interface ConfirmDeleteOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
}

export function useDeleteConfirmation() {
  const [options, setOptions] = React.useState<ConfirmDeleteOptions | null>(null);

  const confirmDelete = React.useCallback((opts: ConfirmDeleteOptions) => {
    setOptions(opts);
  }, []);

  const ConfirmDialog = (
    <DeleteConfirmationModal
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) setOptions(null);
      }}
      title={options?.title}
      description={options?.description}
      confirmLabel={options?.confirmLabel}
      onConfirm={options?.onConfirm ?? (async () => {})}
    />
  );

  return { confirmDelete, ConfirmDialog };
}
