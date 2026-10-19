import { ImageResponse } from "next/og";
import type { SiteSettings } from "@/lib/types";
import { getSettings } from "@/lib/api";
import { resolveBranding } from "@/lib/branding";
import { accentHex, APP_BG_DARK } from "@/lib/pwa";

// App icons are drawn from the brand: the first letter of the brand name plus an accent-coloured dot on a dark
// tile (the same "NAME." look as the header). Sizes: 180 (iPhone home screen), 192/512 (Android, desktop) and
// a full-bleed maskable 512 whose letter stays inside the safe zone.
export const revalidate = 3600;

const SIZES: Record<string, { px: number; maskable: boolean }> = {
  "180": { px: 180, maskable: true },
  "192": { px: 192, maskable: false },
  "512": { px: 512, maskable: false },
  "maskable-512": { px: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const spec = SIZES[size];
  if (!spec) return new Response("Not found", { status: 404 });

  const settings = await getSettings().catch(() => ({}) as SiteSettings);
  const name = resolveBranding(settings, "").name;
  const initial = (name.trim().charAt(0) || "A").toUpperCase();
  const accent = accentHex(settings);
  const fontSize = Math.round(spec.px * (spec.maskable ? 0.46 : 0.56));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: APP_BG_DARK,
          // regular icons get rounded corners; maskable/iOS are full-bleed (the OS rounds them)
          borderRadius: spec.maskable ? 0 : Math.round(spec.px * 0.22),
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", color: "#f2f2ee", fontSize, fontWeight: 800, lineHeight: 1, letterSpacing: -fontSize * 0.04 }}>
          {initial}
          <span style={{ color: accent }}>.</span>
        </div>
      </div>
    ),
    { width: spec.px, height: spec.px },
  );
}
