const securityHeaders = [
  {
    "key": "Content-Security-Policy",
    "value": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; worker-src 'self' blob:; frame-src 'self' https:; manifest-src 'self'; upgrade-insecure-requests"
  },
  {
    "key": "Strict-Transport-Security",
    "value": "max-age=31536000"
  },
  {
    "key": "X-Content-Type-Options",
    "value": "nosniff"
  },
  {
    "key": "X-Frame-Options",
    "value": "DENY"
  },
  {
    "key": "Referrer-Policy",
    "value": "strict-origin-when-cross-origin"
  },
  {
    "key": "Permissions-Policy",
    "value": "camera=(self), microphone=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), xr-spatial-tracking=(self), fullscreen=(self)"
  }
]

const isStaticExport = process.env.URAI_FIREBASE_STATIC_EXPORT === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }]
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
