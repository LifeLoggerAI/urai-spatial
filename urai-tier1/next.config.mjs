import { readFileSync } from 'node:fs'

const onVercel = process.env.VERCEL === '1'
const isSha = (value) => /^[0-9a-f]{40}$/.test(value)

if (onVercel || process.env.URAI_ENFORCE_SOURCE_SHA_MATCH === 'true') {
  const providerSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').trim()
  const advertisedSha = (process.env.NEXT_PUBLIC_URAI_BUILD_SHA || '').trim()

  if (isSha(providerSha) && isSha(advertisedSha)) {
    if (advertisedSha !== providerSha) {
      throw new Error('URAI_SOURCE_SHA_MISMATCH: Vercel Git SHA and advertised build SHA must match exactly before compilation')
    }
  } else {
    // Source-file Vercel deployments have no provider Git SHA. They use the
    // bootstrap-generated, read-back attestation instead; this is a distinct
    // contract and never treats an environment variable as source proof.
    const attestationPath = (process.env.URAI_NON_GIT_SOURCE_ATTESTATION_PATH || '').trim()
    if (!attestationPath) {
      throw new Error('URAI_SOURCE_ATTESTATION_REQUIRED: non-Git Vercel builds require a reviewed source attestation')
    }

    let attestation
    try {
      attestation = JSON.parse(readFileSync(attestationPath, 'utf8'))
    } catch (error) {
      throw new Error(`URAI_SOURCE_ATTESTATION_INVALID: unable to read ${attestationPath}: ${error.message}`)
    }

    if (attestation.protocol !== 'urai-r1545-source-attestation-v1' ||
        attestation.applicationSourceEquivalent !== true ||
        !isSha(attestation.deployedSourceCommit) ||
        !isSha(attestation.deployedSourceTree) ||
        !isSha(attestation.testedApplicationCommit) ||
        !isSha(attestation.testedApplicationTree) ||
        attestation.productionPromotion !== 'forbidden' ||
        attestation.privateMemoryWrites !== 'disabled') {
      throw new Error('URAI_SOURCE_ATTESTATION_MISMATCH: reviewed immutable source attestation did not satisfy the fail-closed contract')
    }

    console.log('URAI_NON_GIT_SOURCE_ATTESTATION_PASS', JSON.stringify({
      deployedSourceCommit: attestation.deployedSourceCommit,
      deployedSourceTree: attestation.deployedSourceTree,
      testedApplicationCommit: attestation.testedApplicationCommit,
      testedApplicationTree: attestation.testedApplicationTree,
    }))
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
