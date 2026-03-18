import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.cloudworkstations.dev",
    "localhost:9000",
    "127.0.0.1:9000",
    "localhost:9002",
    "127.0.0.1:9002",
    "0.0.0.0:9002",
  ],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
