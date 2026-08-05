import type { NextConfig } from "next";

// apps/web and apps/api are separate Vercel project domains (not
// subdomains of one apex), so a session cookie set by the API can never be
// read back by this app. Proxying influencer-auth traffic through this
// app's own origin makes those requests same-origin from the browser's
// perspective, so the influencer session cookie lands on *this* domain
// instead — same reasoning/pattern as apps/admin/next.config.ts, scoped
// here to just the influencer-auth surface since every other data fetch in
// this app already goes server-side, direct to NEXT_PUBLIC_API_URL (see
// apps/web/src/lib/api.ts), and never touches this rewrite.
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@agency/ui", "@agency/types", "@agency/utils", "@agency/auth"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/v1/influencer-auth/:path*", destination: `${apiOrigin}/api/v1/influencer-auth/:path*` },
      { source: "/api/v1/influencer-otp/:path*", destination: `${apiOrigin}/api/v1/influencer-otp/:path*` },
      { source: "/api/v1/influencers/:path*", destination: `${apiOrigin}/api/v1/influencers/:path*` },
      { source: "/api/v1/influencer-applications/:path*", destination: `${apiOrigin}/api/v1/influencer-applications/:path*` },
      { source: "/api/v1/influencer-discounts/:path*", destination: `${apiOrigin}/api/v1/influencer-discounts/:path*` },
    ];
  },
};

export default nextConfig;
