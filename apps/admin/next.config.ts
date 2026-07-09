import type { NextConfig } from "next";

// Real API origin — apps/web and apps/api are separate *.vercel.app project
// domains (not subdomains of one apex), so a session cookie set by the API
// can never be read by this app's own middleware/pages. Proxying all API
// traffic through this app's own origin makes every request same-origin
// from the browser's perspective, so Better Auth's session cookie lands on
// *this* domain instead — see apps/admin/src/lib/{api,auth-client}.ts.
// NEXT_PUBLIC_API_URL is configured on Vercel with a trailing slash, which
// produced a `...vercel.app//api/v1/:path*` destination (double slash) that
// Vercel's edge resolved as a same-path 308 redirect loop instead of a
// proxy. Stripping it defensively so this can't regress silently.
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
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }];
  },
};

export default nextConfig;
