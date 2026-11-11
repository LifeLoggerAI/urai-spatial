import { existsSync } from 'node:fs'
import { adamLocalEmulatorRewrites } from './scripts/adam-local-functions-proxy.mjs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WORLD001_V3_PUBLIC = join(
  dirname(fileURLToPath(import.meta.url)),
  'public/assets/urai/world001-preview/URAI_WORLD001_FOUNDER_HOME_ARCHITECTURE_v3.glb',
)
const CC0_REVIEW_PUBLIC = join(
  dirname(fileURLToPath(import.meta.url)),
  'public/assets/urai/home-production/cc0-review',
)
// These are development-only review assets, never certified release art.
if ((process.env.NODE_ENV === 'production' || process.env.URAI_FIREBASE_STATIC_EXPORT === 'true') && existsSync(CC0_REVIEW_PUBLIC)) {
  throw new Error('Release blocked: unapproved CC0 review textures/models remain in Next public/')
}
// Retain this guard even when Next selects next.config.mjs instead of next.config.ts.
if ((process.env.NODE_ENV === 'production' || process.env.URAI_FIREBASE_STATIC_EXPORT === 'true') && existsSync(WORLD001_V3_PUBLIC)) {
  throw new Error('Release blocked: nonproduction World001 V3 model is staged under Next public/')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // An isolated, explicit nonproduction asset-review process must never share
  // its Next output with the founder's working production build.
  ...(process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW === 'true'
    ? { distDir: '.next-home-cc0-review' }
    : {}),
  // Keep the full build within bounded worker memory without skipping analysis.
  experimental: { cpus: 1, webpackBuildWorker: true, webpackMemoryOptimizations: true },
  ...(process.env.URAI_FIREBASE_STATIC_EXPORT === 'true'
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
  ...(process.env.URAI_ADAM_LOCAL_EMULATOR_PROXY === 'true'
    ? { async rewrites() { return adamLocalEmulatorRewrites() } }
    : {}),
  webpack(config) {
    // URAI Spatial builds frequently run in constrained preview/Nix containers where
    // webpack's filesystem cache can exhaust the writable volume before compilation
    // completes. Keep builds deterministic and low-disk by disabling that cache unless
    // a release machine explicitly opts back in.
    if (process.env.URAI_ENABLE_WEBPACK_FILESYSTEM_CACHE !== 'true') {
      config.cache = false
    }

    return config
  },
}

export default nextConfig
