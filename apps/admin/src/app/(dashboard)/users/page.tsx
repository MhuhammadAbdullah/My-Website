"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Heading,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  banned: boolean;
  role: Role | null;
}

export default function UsersPage() {
  const { data: users, loading, reload } = useAsyncData<User[]>(
    () => request<{ items: User[] }>("/users").then((r) => r.items),
    [],
  );
  const { data: roles } = useAsyncData<Role[]>(() => request<{ items: Role[] }>("/roles").then((r) => r.items), []);
  const [showNew, setShowNew] = React.useState(false);

  async function updateUser(id: string, data: Partial<{ roleId: string; banned: boolean }>) {
    try {
      await request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      toast.success("User updated");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Users</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">Admin panel users and their assigned role.</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus /> New user
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select value={user.role?.id} onValueChange={(roleId) => updateUser(user.id, { roleId })}>
                      <SelectTrigger className="h-9 w-48">
                        <SelectValue placeholder="No role" />
                      </SelectTrigger>
                      <SelectContent>
                        {(roles ?? []).map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!user.banned}
                      onCheckedChange={(checked) => updateUser(user.id, { banned: !checked })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {showNew && (
        <NewUserDialog
          roles={roles ?? []}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

interface NewUserFormState {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

function NewUserDialog({ roles, onClose, onSaved }: { roles: Role[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState<NewUserFormState>({ name: "", email: "", password: "", roleId: "" });
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof NewUserFormState>(key: K, value: NewUserFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await request("/users", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          roleId: form.roleId || undefined,
        }),
      });
      toast.success("User created");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex w-full max-w-md flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>New user</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Jane Doe" />
          </div>

          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" />
          </div>

          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-label text-neutral-400">Share this with them directly — there's no invite email.</p>
          </div>

          <div>
            <Label>Role (optional)</Label>
            <Select value={form.roleId} onValueChange={(v) => set("roleId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="No role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creating…" : "Create user"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
