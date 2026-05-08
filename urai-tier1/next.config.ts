import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const uraiAllowedDevOrigins = [
  "3000-firebase-urai-spatial-1769687960051.cluster-c72u3gwiofapkvxrcwjq5zllcu.cloudworkstations.dev"
] as const;

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  webpack: (config) => {
    // Cloud Workstations can fill /ephemeral during large webpack cache writes.
    // Disable filesystem caching for launch/deploy builds to reduce disk pressure.
    config.cache = false;
    return config;
  },
  allowedDevOrigins: uraiAllowedDevOrigins,
};

export default nextConfig;
