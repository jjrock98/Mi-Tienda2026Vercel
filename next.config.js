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
      // Scripts: Mercado Pago, Tawk.to (todos los subdominios), CDN, Vercel
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com https://*.tawk.to https://cdn.jsdelivr.net https://va.vercel-scripts.com",
      // Estilos: Google Fonts, Tawk.to, CDN
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tawk.to https://cdn.jsdelivr.net",
      // Fuentes: Google, Tawk.to
      "font-src 'self' https://fonts.gstatic.com https://*.tawk.to",
      // Imágenes: Supabase, Google, Tawk.to, placeholders
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.tawk.to https://*.tawk.link https://via.placeholder.com",
      // Frames: Mercado Pago, YouTube, Google, Tawk.to
      "frame-src 'self' https://www.mercadopago.com https://www.mercadopago.com.ar https://www.youtube.com https://www.google.com https://*.tawk.to",
      // Conexiones (fetch, WebSockets, XHR): Supabase, Mercado Pago, Tawk.to, CDN
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://*.tawk.to wss://*.tawk.to https://va.tawk.to https://embed.tawk.to https://cdn.jsdelivr.net",
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