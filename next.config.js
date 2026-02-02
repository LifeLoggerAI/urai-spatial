/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*', 
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://urai-spatial.web.app;"
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;
