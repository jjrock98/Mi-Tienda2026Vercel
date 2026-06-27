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

const siteName = process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda';
const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mc-importados.xyz';
const defaultDescription = 'Encontrá los mejores productos por packs. Media docena y docena con envíos a todo el país.';

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  manifest: '/manifest.json',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: siteName,
    title: siteName,
    description: defaultDescription,
    url: siteUrl,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: siteName }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: defaultDescription,
    images: ['/og-image.jpg'],
    site: '@mc_importados',
    creator: '@mc_importados',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  verification: {
    google: 's3kD92XTr9ajSAy0L1tzybztVQRIV1HSy8D66nTw-GM',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let contactData = null;

  try {
    const supabase = await createClient();
    
    const { data: contactInfo, error } = await supabase
      .from('contact_info')
      .select('*')
      .single();

    if (!error && contactInfo) {
      contactData = contactInfo;
    }
  } catch (err: unknown) {
    // Verificamos si es un error de Next.js para dejarlo pasar
    if (err instanceof Error && 'digest' in err && err.digest === 'DYNAMIC_SERVER_USAGE') {
      throw err;
    }
    // Si es otro tipo de error, lo ignoramos para que la página cargue siempre
    console.error("Error al cargar datos de contacto:", err);
  }

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