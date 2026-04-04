import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@worldcoin/minikit-js", "@worldcoin/idkit-core"],
};

export default nextConfig;
