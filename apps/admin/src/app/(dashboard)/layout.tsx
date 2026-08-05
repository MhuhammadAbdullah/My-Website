import { AdminShell } from "@/components/admin-shell";
import { PermissionsProvider } from "@/lib/use-permissions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionsProvider>
      <AdminShell>{children}</AdminShell>
    </PermissionsProvider>
  );
}
