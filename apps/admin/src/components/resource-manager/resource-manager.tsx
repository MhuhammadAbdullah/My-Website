"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Heading,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@agency/ui";
import { useAsyncData } from "@/lib/use-resource";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import type { createResourceClient } from "@/lib/api";
import { ResourceForm, type FormValues } from "./resource-form";
import type { ColumnConfig, FieldConfig } from "./types";

interface ResourceManagerProps<T extends { id: string }> {
  title: string;
  description?: string;
  resourceClient: ReturnType<typeof createResourceClient<T>>;
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  defaultValues: FormValues;
  useAdminList?: boolean;
  toFormValues?: (item: T) => FormValues;
  filter?: (item: T) => boolean;
}

export function ResourceManager<T extends { id: string }>({
  title,
  description,
  resourceClient,
  columns,
  fields,
  defaultValues,
  useAdminList = false,
  toFormValues,
  filter,
}: ResourceManagerProps<T>) {
  const { data: rawItems, loading, reload } = useAsyncData<T[]>(
    () => (useAdminList ? resourceClient.listAdmin() : resourceClient.list()),
    [],
  );
  const items = filter ? rawItems?.filter(filter) : rawItems;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<T | null>(null);
  const [values, setValues] = React.useState<FormValues>(defaultValues);
  const [saving, setSaving] = React.useState(false);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

  function openCreate() {
    setEditing(null);
    setValues(defaultValues);
    setDialogOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setValues(toFormValues ? toFormValues(item) : (item as unknown as FormValues));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await resourceClient.update(editing.id, values as Partial<T>);
        toast.success(`${title.replace(/s$/, "")} updated`);
      } else {
        await resourceClient.create(values as Partial<T>);
        toast.success(`${title.replace(/s$/, "")} created`);
      }
      setDialogOpen(false);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(item: T) {
    const label = title.toLowerCase().replace(/s$/, "");
    confirmDelete({
      title: `Delete this ${label}?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        await resourceClient.remove(item.id);
        toast.success("Deleted");
        reload();
      },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>{title}</Heading>
          {description && <p className="mt-1 text-body-sm text-neutral-500">{description}</p>}
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add new
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit">
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} aria-label="Delete">
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-neutral-400">
                    Nothing here yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col p-0">
          <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
            <DialogTitle>{editing ? `Edit ${title.toLowerCase().replace(/s$/, "")}` : `New ${title.toLowerCase().replace(/s$/, "")}`}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <ResourceForm fields={fields} values={values} onChange={setValues} />
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 px-5 py-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}
