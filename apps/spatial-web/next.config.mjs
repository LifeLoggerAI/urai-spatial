/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/xr"] }
};
export default nextConfig;
