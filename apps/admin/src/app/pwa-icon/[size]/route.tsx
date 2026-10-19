import { ImageResponse } from "next/og";

const SIZES: Record<string, { px: number; maskable: boolean }> = {
  "180": { px: 180, maskable: true },
  "192": { px: 192, maskable: false },
  "512": { px: 512, maskable: false },
  "maskable-512": { px: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

// "A." on a dark tile: the admin's own app icon (the public site generates its icon from the brand name).
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const spec = SIZES[size];
  if (!spec) return new Response("Not found", { status: 404 });
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
          background: "#0b0b0c",
          borderRadius: spec.maskable ? 0 : Math.round(spec.px * 0.22),
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", color: "#f2f2ee", fontSize, fontWeight: 800, lineHeight: 1, letterSpacing: -fontSize * 0.04 }}>
          A<span style={{ color: "#c8f25a" }}>.</span>
        </div>
      </div>
    ),
    { width: spec.px, height: spec.px },
  );
}
