import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { adamLocalEmulatorRewrites } from './scripts/adam-local-functions-proxy.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isFirebaseStaticExport = process.env.URAI_FIREBASE_STATIC_EXPORT === "true";
const CC0_REVIEW_PUBLIC = path.join(projectRoot, "public/assets/urai/home-production/cc0-review");
if ((process.env.NODE_ENV === "production" || isFirebaseStaticExport) && existsSync(CC0_REVIEW_PUBLIC)) {
  throw new Error("Release blocked: unapproved CC0 review textures/models remain in Next public/");
}


// A query-string toggle does not protect an asset placed under public/.
// Refuse any production build while the disposable modeled V3 file is staged.
const WORLD001_V3_PUBLIC = path.join(
  projectRoot,
  "public/assets/urai/world001-preview/URAI_WORLD001_FOUNDER_HOME_ARCHITECTURE_v3.glb",
);
if ((process.env.NODE_ENV === "production" || isFirebaseStaticExport) && existsSync(WORLD001_V3_PUBLIC)) {
  throw new Error("Release blocked: nonproduction World001 V3 model is staged under Next public/");
}


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
  // An isolated, explicit nonproduction asset-review process must never share
  // its Next output with the founder's working production build.
  ...(process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW === 'true'
    ? { distDir: '.next-home-cc0-review' }
    : {}),
  // Keep the full build within bounded worker memory without skipping analysis.
  experimental: { cpus: 1, webpackBuildWorker: true, webpackMemoryOptimizations: true },
  outputFileTracingRoot: projectRoot,
  ...(isFirebaseStaticExport
    ? {
        output: "export",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        async rewrites() {
          return [{ source: "/home", destination: "/" }, ...adamLocalEmulatorRewrites()];
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
