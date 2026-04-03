import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@0gfoundation/0g-ts-sdk",
    "@0glabs/0g-serving-broker",
    "ethers",
  ],
};

export default nextConfig;
