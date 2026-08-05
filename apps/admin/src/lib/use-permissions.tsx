"use client";

import * as React from "react";
import { request } from "./api";

interface PermissionsContextValue {
  permissions: string[];
  loading: boolean;
  can: (resource: string, action: string) => boolean;
}

const PermissionsContext = React.createContext<PermissionsContextValue | null>(null);

// Mounted once in the dashboard layout so the sidebar and the route guard
// (admin-route-guard.tsx) read the exact same /users/me fetch instead of
// each independently re-fetching -- keeps them from ever disagreeing about
// what's still loading vs. what's actually allowed.
export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    request<{ permissions: string[] }>("/users/me")
      .then((r) => {
        if (!cancelled) setPermissions(r.permissions);
      })
      .catch(() => {
        if (!cancelled) setPermissions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const can = React.useCallback((resource: string, action: string) => permissions.includes(`${resource}:${action}`), [permissions]);

  const value = React.useMemo(() => ({ permissions, loading, can }), [permissions, loading, can]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const ctx = React.useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}
