/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  poweredByHeader: false,

  // CI reports the existing lint backlog separately as an informational job.
  // Keep production builds aligned with that policy until lint becomes a gate.
  eslint: {
    ignoreDuringBuilds: true,
  },

  compiler: {
    // Strip console.log/debug/info in production; keep .warn and .error for Vercel logs
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.danhov.com' },
      { protocol: 'https', hostname: 'danhov.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'pub-2d92bc9fc39242bf95b565216d0b999e.r2.dev' },
    ],
  },

  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },

  async headers() {
    const sharedSecurityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
    ];

    return [
      {
        source: '/authorizenet-iframe-communicator.html',
        headers: sharedSecurityHeaders,
      },
      {
        source: '/authorizenet-empty.html',
        headers: sharedSecurityHeaders,
      },
      {
        source: '/((?!authorizenet-iframe-communicator\\.html|authorizenet-empty\\.html).*)',
        headers: [
          ...sharedSecurityHeaders,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
