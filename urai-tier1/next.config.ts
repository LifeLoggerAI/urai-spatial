import type { NextConfig } from "next";

const uraiAllowedDevOrigins = [
  "3000-firebase-urai-spatial-1769687960051.cluster-c72u3gwiofapkvxrcwjq5zllcu.cloudworkstations.dev"
] as const;

const nextConfig: NextConfig = {
  allowedDevOrigins: uraiAllowedDevOrigins,
};

export default nextConfig;
