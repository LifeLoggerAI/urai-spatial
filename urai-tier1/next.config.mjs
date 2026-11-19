// Non-Git uploads must not use a builder-authored JSON document as source proof.
// Until a separately reviewed checkout/artifact attestation contract exists,
// keep these builds blocked; never fabricate VERCEL_GIT_COMMIT_SHA to proceed.
const onVercel = process.env.VERCEL === '1'

if (onVercel || process.env.URAI_ENFORCE_SOURCE_SHA_MATCH === 'true') {
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
