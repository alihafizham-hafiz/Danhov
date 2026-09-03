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
    // Report-Only for now: logs what the policy *would* have blocked without
    // actually blocking anything, so nothing on the live site can break from
    // this. frame-src is intentionally broad (https: rather than a named
    // allowlist) because the ring-builder's diamond 360°-viewer iframe comes
    // from whichever vendor domain Nivoda's API returns per-stone across its
    // supplier network — not a small fixed list we can safely enumerate.
    // Once a stretch of real traffic shows no unexpected violations, switch
    // this to the enforcing `Content-Security-Policy` header.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://assets.calendly.com https://nowl.ink https://www.zyratalk.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://www.googletagmanager.com https://*.google-analytics.com https://*.zyratalk.com wss://*.zyratalk.com",
      "frame-src 'self' https:",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "report-to default",
    ].join('; ');

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
      { key: 'Content-Security-Policy-Report-Only', value: csp },
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
