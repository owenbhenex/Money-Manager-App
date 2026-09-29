import type { NextConfig } from "next";

// Static export is enabled ONLY for Capacitor mobile builds (npm run build:mobile).
// The normal web build keeps dynamic API routes.
const isMobileBuild = process.env.MOBILE_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isMobileBuild
    ? {
        output: "export" as const,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
