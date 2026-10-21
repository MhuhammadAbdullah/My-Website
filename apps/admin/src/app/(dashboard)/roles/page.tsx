"use client";

import * as React from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Heading, Input, Label, Skeleton, Textarea, cn, toast } from "@agency/ui";
import { createResourceClient, request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { usePermissions } from "@/lib/use-permissions";
import { useDeleteConfirmation } from "@/lib/use-delete-confirmation";
import { useOpenOnNew } from "@/lib/use-open-on-new";

interface Permission {
  id: string;
  resource: string;
  action: string;
  label: string;
}

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permissionId: string; permission: Permission }[];
}

const client = createResourceClient<Role>("/roles");
const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const ACTION_ORDER = ["view", "create", "update", "delete"];
const titleCase = (v: string) =>
  v
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

// Roles: a list of cards, and a dialog with a section x action grid instead of one long multi-select.
export default function RolesPage() {
  const { can } = usePermissions();
  const { data: permissions } = useAsyncData<Permission[]>(() => request<{ items: Permission[] }>("/permissions").then((r) => r.items), []);
  const { data: roles, loading, reload } = useAsyncData<Role[]>(() => client.list(), []);
  const [editing, setEditing] = React.useState<Role | "new" | null>(null);
  const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
  useOpenOnNew(() => setEditing("new"));

  function handleDelete(role: Role) {
    confirmDelete({
      title: `Delete the "${role.name}" role?`,
      description: "Users with this role will lose its access. This cannot be undone.",
      onConfirm: async () => {
        await client.remove(role.id);
        toast.success("Role deleted");
        reload();
      },
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <Heading level={2} className="admin-page-title">
            Roles
          </Heading>
          <p className="mt-2 max-w-2xl text-body-sm text-neutral-500">
            A role decides what each admin user can see and change. Give people the smallest role that lets them do their job.
          </p>
        </div>
        {can("roles", "create") && (
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add role
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="mt-6 h-48 w-full" />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(roles ?? []).map((role) => (
            <section key={role.id} className="flex flex-col rounded-[10px] border border-neutral-200 bg-neutral-50 p-5">
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-2 font-heading text-[1.0625rem] font-extrabold tracking-tight text-heading">
                  {role.name}
                  {role.isSystem && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                      <Lock className="size-3" aria-hidden /> System
                    </span>
                  )}
                </h3>
                <p className="mt-1 line-clamp-2 text-[13px] text-neutral-500">{role.description || "No description."}</p>
              </div>
              <p className="mt-4 flex items-baseline gap-2 text-label text-neutral-500">
                <span className="font-heading text-[1.5rem] font-extrabold text-heading">{role.permissions.length}</span> permissions granted
              </p>
              <div className="mt-auto flex gap-2 border-t border-neutral-200 pt-4">
                {can("roles", "update") && (
                  <Button variant="outline" size="sm" className="mt-0 flex-1" onClick={() => setEditing(role)}>
                    <Pencil /> {role.isSystem ? "View" : "Edit"}
                  </Button>
                )}
                {can("roles", "delete") && !role.isSystem && (
                  <Button variant="outline" size="sm" className="border-error-500/40 text-error-500 hover:bg-error-500/10" onClick={() => handleDelete(role)} aria-label={`Delete ${role.name}`}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <RoleDialog
          role={editing === "new" ? null : editing}
          permissions={permissions ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}

function RoleDialog({ role, permissions, onClose, onSaved }: { role: Role | null; permissions: Permission[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState(role?.name ?? "");
  const [slug, setSlug] = React.useState(role?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(!!role);
  const [description, setDescription] = React.useState(role?.description ?? "");
  const [selected, setSelected] = React.useState<Set<string>>(new Set(role?.permissions.map((p) => p.permissionId) ?? []));
  const [saving, setSaving] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const locked = !!role?.isSystem;

  const grouped = React.useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) map.set(p.resource, [...(map.get(p.resource) ?? []), p]);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);
  const actions = React.useMemo(() => {
    const all = [...new Set(permissions.map((p) => p.action))];
    return [...ACTION_ORDER.filter((a) => all.includes(a)), ...all.filter((a) => !ACTION_ORDER.includes(a)).sort()];
  }, [permissions]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleMany = (perms: Permission[]) =>
    setSelected((s) => {
      const n = new Set(s);
      const all = perms.every((p) => n.has(p.id));
      perms.forEach((p) => (all ? n.delete(p.id) : n.add(p.id)));
      return n;
    });

  const setPreset = (kind: "none" | "view" | "all") =>
    setSelected(new Set(kind === "none" ? [] : permissions.filter((p) => kind === "all" || p.action === "view").map((p) => p.id)));
  const shown = grouped.filter(([resource]) => !filter.trim() || titleCase(resource).toLowerCase().includes(filter.trim().toLowerCase()));

  async function save() {
    if (!name.trim() || !slug.trim()) return toast.error("Name and slug are required");
    setSaving(true);
    try {
      const body = { name: name.trim(), slug: slug.trim(), description: description.trim() || null, permissionIds: [...selected] };
      if (role) await client.update(role.id, body as never);
      else await client.create(body as never);
      toast.success(role ? "Role updated" : "Role created");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const box = (checked: boolean) =>
    cn(
      "flex size-5 items-center justify-center rounded-[5px] border text-[11px] font-extrabold transition-colors",
      checked ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-300 bg-background text-transparent",
      locked && "opacity-60",
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92vh] w-full max-w-6xl flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>{role ? (locked ? `${role.name} (system role)` : `Edit ${role.name}`) : "New role"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {locked && <p className="rounded-[8px] bg-neutral-100 px-3 py-2 text-body-sm text-neutral-600">System roles are protected: you can read them, but not change them.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                disabled={locked}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Content editor"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={slug}
                disabled={locked}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={description} disabled={locked} onChange={(e) => setDescription(e.target.value)} placeholder="Who is this role for?" />
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="mr-auto text-body-sm font-semibold text-heading">
                Permissions <span className="ml-1 font-normal text-neutral-500">· {selected.size} of {permissions.length} selected</span>
              </p>
              <Input aria-label="Filter sections" placeholder="Filter sections…" className="h-9 w-48" value={filter} onChange={(e) => setFilter(e.target.value)} />
              {!locked && (
                <div className="inline-flex gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1" role="group" aria-label="Presets">
                  {([["none", "No access"], ["view", "View only"], ["all", "Full access"]] as const).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setPreset(k)} className="rounded-full px-3 py-1 text-[12px] font-bold text-neutral-500 transition-colors hover:text-heading">
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-[10px] border border-neutral-200">
              <table className="w-full border-collapse text-body-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-neutral-100 text-left">
                    <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-neutral-500">Section</th>
                    {actions.map((a) => (
                      <th key={a} className="px-3 py-2 text-center">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => toggleMany(permissions.filter((p) => p.action === a))}
                          className="font-mono text-[11px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-accent-500 disabled:pointer-events-none"
                          title={`Toggle "${a}" for every section`}
                        >
                          {a}
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-mono text-[11px] uppercase tracking-wider text-neutral-500">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {shown.map(([resource, perms]) => {
                    const all = perms.every((p) => selected.has(p.id));
                    return (
                      <tr key={resource} className="hover:bg-neutral-100/60">
                        <td className="px-3 py-1.5 font-semibold text-heading">{titleCase(resource)}</td>
                        {actions.map((a) => {
                          const p = perms.find((x) => x.action === a);
                          return (
                            <td key={a} className="px-3 py-1.5 text-center">
                              {p ? (
                                <button type="button" role="checkbox" aria-checked={selected.has(p.id)} aria-label={p.label} title={p.label} disabled={locked} onClick={() => toggle(p.id)} className="inline-flex">
                                  <span className={box(selected.has(p.id))}>✓</span>
                                </button>
                              ) : (
                                <span className="text-neutral-300">–</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-center">
                          <button type="button" role="checkbox" aria-checked={all} aria-label={`All ${resource} permissions`} disabled={locked} onClick={() => toggleMany(perms)} className="inline-flex">
                            <span className={box(all)}>✓</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            {locked ? "Close" : "Cancel"}
          </Button>
          {!locked && (
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : role ? "Save role" : "Create role"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
