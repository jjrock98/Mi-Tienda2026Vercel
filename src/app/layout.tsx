import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { createClient } from '@/lib/supabase/server';
import ClientLayout from '@/components/ClientLayout';

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
  icons: {
    icon: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  // ✅ Verificación de Google Search Console
  verification: {
    google: 's3kD92XTr9ajSAy0L1tzybztVQRIV1HSy8D66nTw-GM',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0f0f0f' },
  ],
  width: 'device-width', initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  const { data: contactInfo, error } = await supabase
    .from('contact_info')
    .select('*')
    .single();

  const contactData = error ? null : contactInfo;

  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-body bg-surface text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClientLayout contactInfo={contactData}>
            {children}
          </ClientLayout>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}