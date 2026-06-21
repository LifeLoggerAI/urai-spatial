import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isFirebaseStaticExport = process.env.URAI_FIREBASE_STATIC_EXPORT === "true";

const cloudWorkstationDevOriginBase =
  "firebase-urai-spatial-1769687960051.cluster-c72u3gwiofapkvxrcwjq5zllcu.cloudworkstations.dev";

const uraiAllowedDevOrigins = [
  "3000",
  "3001",
  "3014",
].flatMap((port) => [
  `${port}-${cloudWorkstationDevOriginBase}`,
  `localhost:${port}`,
  `127.0.0.1:${port}`,
  `0.0.0.0:${port}`,
]);

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  ...(isFirebaseStaticExport
    ? {
        output: "export",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        async rewrites() {
          return [{ source: "/home", destination: "/" }];
        },
      }),
  turbopack: {
    root: projectRoot,
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
  allowedDevOrigins: uraiAllowedDevOrigins,
};

export default nextConfig;
