import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import dynamic from 'next/dynamic';

// ✅ Componentes que se cargan SOLO en el cliente (evitan errores de SSR/SSG)
const Navbar = dynamic(
  () => import('@/components/layout/Navbar').then((mod) => mod.Navbar),
  { ssr: false }
);

const EmailVerificationBanner = dynamic(
  () => import('@/components/common/EmailVerificationBanner').then((mod) => mod.EmailVerificationBanner),
  { ssr: false }
);

// ── El resto de componentes se mantienen estáticos ──
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { TawkTo } from '@/components/common/TawkTo';
import { CookieConsent } from '@/components/common/CookieConsent';
import { BackToTop } from '@/components/common/BackToTop';
// import { PageProgress } from '@/components/common/PageProgress'; // Comentado por ahora

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: { default: process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda', template: `%s | ${process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda'}` },
  description: 'La mejor tienda online de productos por pack',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000'),
  openGraph: { type: 'website', locale: 'es_AR', siteName: process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0f0f0f' },
  ],
  width: 'device-width', initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-body bg-surface text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* PageProgress comentado por ahora */}
          {/* <PageProgress /> */}
          
          <EmailVerificationBanner /> {/* ✅ Ahora dinámico */}
          
          <div className="flex min-h-screen flex-col">
            <Navbar /> {/* ✅ Dinámico */}
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          
          <WhatsAppButton />
          <BackToTop />
          <CookieConsent />
          <TawkTo />
          <Toaster position="top-right" toastOptions={{ className: 'dark:bg-zinc-800 dark:text-white text-sm', duration: 3500 }} />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}