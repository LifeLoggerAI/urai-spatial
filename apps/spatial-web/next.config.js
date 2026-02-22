/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '3000-firebase-urai-spatial-1769687960051.cluster-c72u3gwiofapkvxrcwjq5zllcu.cloudworkstations.dev'
  ],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      three: require.resolve('three'),
    }
    return config
  },
}

module.exports = nextConfig