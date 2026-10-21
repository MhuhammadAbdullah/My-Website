"use client";

import * as React from "react";
import { Heading } from "@agency/ui";
import { request } from "@/lib/api";
import type { SiteSettings } from "@/lib/types";

// The centred card shared by the sign-in, forgot-password and reset-password screens.
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [brandName, setBrandName] = React.useState("");
  React.useEffect(() => {
    request<{ settings: SiteSettings }>("/settings")
      .then((r) => setBrandName(r.settings.branding?.brandName || r.settings.company_name || ""))
      .catch(() => undefined);
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-[14px] border border-neutral-200 bg-neutral-50 p-8 shadow-soft-lg">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{brandName ? `${brandName} control panel` : "Control panel"}</p>
        <Heading level={2} className="mt-3 text-center">
          {title}
        </Heading>
        {subtitle && <p className="mt-2 text-center text-body-sm text-neutral-500">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}
