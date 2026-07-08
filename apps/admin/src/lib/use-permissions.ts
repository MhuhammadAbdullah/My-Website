"use client";

import { request } from "./api";
import { useAsyncData } from "./use-resource";

export function usePermissions() {
  const { data, loading } = useAsyncData<string[]>(
    () => request<{ permissions: string[] }>("/users/me").then((r) => r.permissions),
    [],
  );

  function can(resource: string, action: string) {
    return (data ?? []).includes(`${resource}:${action}`);
  }

  return { can, loading };
}
