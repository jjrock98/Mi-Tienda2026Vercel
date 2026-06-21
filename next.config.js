/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // ✅ Se permite cualquier subdominio de tawk.to
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com https://*.tawk.to https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
      // ✅ Se permite cualquier subdominio de tawk.to para iframes
      "frame-src 'self' https://www.mercadopago.com https://www.mercadopago.com.ar https://www.youtube.com https://www.google.com https://*.tawk.to",
      // ✅ Se permite cualquier subdominio de tawk.to para conexiones (fetch, XHR, etc.)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://*.tawk.to https://va.tawk.to",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      { source: '/(.*)',               headers: securityHeaders },
      { source: '/api/webhooks/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }, ...securityHeaders] },
    ];
  },

  poweredByHeader: false,
  compress:        true,
  reactStrictMode: false,
  swcMinify:       true,

  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

module.exports = nextConfig;