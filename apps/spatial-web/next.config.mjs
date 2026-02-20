/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  reactStrictMode: true,
  experimental: { optimizePackageImports: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/xr"] }
};
export default nextConfig;
