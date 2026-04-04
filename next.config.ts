import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@worldcoin/minikit-js"],
};

export default nextConfig;
