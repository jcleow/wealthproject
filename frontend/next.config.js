/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react'],
  turbopack: {
    // Force Turbopack root to this worktree's frontend to avoid parent lockfile warnings
    root: __dirname,
  },
  // API routes at src/app/api/v1/[...path]/route.ts handle backend proxying
  // with proper authentication (session validation + HMAC signing)
}

module.exports = nextConfig
