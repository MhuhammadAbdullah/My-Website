"use client";

import * as React from "react";
import { Heading, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@agency/ui";
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
      <Heading level={2}>Users</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Admin panel users and their assigned role.</p>

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
    </div>
  );
}
