/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react'],
  async rewrites() {
    const backendBase = process.env.NEXT_PUBLIC_GO_BACKEND_BASE_URL || 'http://verylocal:8080/api/v1'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendBase}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
