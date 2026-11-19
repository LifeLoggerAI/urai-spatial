// Vercel Git deployments must not claim an arbitrary source SHA supplied through
// NEXT_PUBLIC_URAI_BUILD_SHA. Compare that label with Vercel's provider Git
// revision before any Next.js compilation begins. This is build-time consistency,
// not signed supply-chain attestation or release approval.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const onVercel = process.env.VERCEL === '1'
if (process.env.URAI_REVIEW_SOURCE_UPLOAD === 'true') {
  // Exact Git checkout + a checked review-only lock are required for the
  // separate source-file upload path, which has no Vercel Git connection.
  // Never substitute a fabricated VERCEL_GIT_COMMIT_SHA.
  try {
    if (!onVercel || process.env.VERCEL_ENV !== 'preview') throw new Error('not preview')
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const lock = JSON.parse(readFileSync(resolve(root, '.urai-r1536/source-lock.json'), 'utf8'))
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim()
    const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim()
    const advertised = (process.env.NEXT_PUBLIC_URAI_BUILD_SHA || '').trim()
    const provider = (process.env.VERCEL_GIT_COMMIT_SHA || '').trim()
    if (!/^[a-f0-9]{40}$/.test(head) || !/^[a-f0-9]{40}$/.test(tree) ||
      head !== advertised || head !== lock.sourceSha || tree !== lock.sourceTreeSha ||
      (provider && provider !== head) || lock.releaseAuthorized !== false ||
      lock.privateMemoryWrites !== 'DISABLED' || lock.reviewOnly !== true) {
      throw new Error('not exact source')
    }
  } catch {
    throw new Error('URAI_SOURCE_UPLOAD_PROVENANCE_DENIED: exact Git checkout, review lock, and preview-only build identity required')
  }
} else if (onVercel || process.env.URAI_ENFORCE_SOURCE_SHA_MATCH === 'true') {
  const providerSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').trim()
  const advertisedSha = (process.env.NEXT_PUBLIC_URAI_BUILD_SHA || '').trim()
  if (!/^[0-9a-f]{40}$/.test(providerSha) ||
      !/^[0-9a-f]{40}$/.test(advertisedSha) ||
      advertisedSha !== providerSha) {
    throw new Error('URAI_SOURCE_SHA_MISMATCH: Vercel Git SHA and advertised build SHA must match exactly before compilation')
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.URAI_FIREBASE_STATIC_EXPORT === 'true'
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
  // Firebase static exports use firebase.static.json. Dynamic Next/Vercel
  // responses need this same limited baseline at their serving boundary.
  ...(process.env.URAI_FIREBASE_STATIC_EXPORT === 'true'
    ? {}
    : {
        async headers() {
          return [{
            source: '/:path*',
            headers: [
              { key: 'X-Content-Type-Options', value: 'nosniff' },
              { key: 'Referrer-Policy', value: 'no-referrer' },
              { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
            ],
          }]
        },
      }),
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
