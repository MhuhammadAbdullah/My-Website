import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agency/ui", "@agency/types", "@agency/utils"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
