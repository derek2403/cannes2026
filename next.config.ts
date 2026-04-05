import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@0gfoundation/0g-ts-sdk",
    "@0glabs/0g-serving-broker",
    "ethers",
    "@worldcoin/minikit-js", 
    "@worldcoin/idkit-core"
  ],
};
// next.config.js
module.exports = {
  allowedDevOrigins: ['a3b6-83-144-21-99.ngrok-free.app'],
}
export default nextConfig;
