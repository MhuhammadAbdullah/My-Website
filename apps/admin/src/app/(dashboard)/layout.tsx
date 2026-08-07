import { AdminShell } from "@/components/admin-shell";
import { PermissionsProvider } from "@/lib/use-permissions";
import { SiteBrandingProvider } from "@/lib/use-site-branding";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionsProvider>
      <SiteBrandingProvider>
        <AdminShell>{children}</AdminShell>
      </SiteBrandingProvider>
    </PermissionsProvider>
  );
}
