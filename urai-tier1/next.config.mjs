/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.URAI_FIREBASE_STATIC_EXPORT === 'true'
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
        pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],
      }
    : {}),
}

export default nextConfig
