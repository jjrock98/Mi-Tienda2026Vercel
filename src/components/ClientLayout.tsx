'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'react-hot-toast';
import { CartFloatingButton } from '@/components/cart/CartFloatingButton';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/common/WhatsAppButton';
import { TawkTo } from '@/components/common/TawkTo';
import { CookieConsent } from '@/components/common/CookieConsent';
import { BackToTop } from '@/components/common/BackToTop';
import { ConfirmationMessage } from '@/components/common/ConfirmationMessage';

const Navbar = dynamic(() => import('@/components/layout/Navbar').then((mod) => mod.Navbar), { ssr: false });
const EmailVerificationBanner = dynamic(
  () => import('@/components/common/EmailVerificationBanner').then((mod) => mod.EmailVerificationBanner),
  { ssr: false }
);

interface ClientLayoutProps {
  children: React.ReactNode;
  contactInfo: any;
}

export default function ClientLayout({ children, contactInfo }: ClientLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.react-hot-toast')) {
        toast.dismiss();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Mientras no está montado, mostramos un placeholder simple para evitar hidratación
  if (!mounted) {
    return <div className="min-h-screen bg-surface" />;
  }

  return (
    <>
      <EmailVerificationBanner />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pb-32 md:pb-20 lg:pb-16">{children}</main>
        <Footer contactInfo={contactInfo} />
      </div>

      <WhatsAppButton />
      <BackToTop />
      <CookieConsent />
      <TawkTo />
      <ConfirmationMessage />

      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-zinc-800 dark:text-white text-sm cursor-pointer',
          duration: 4000,
          style: { marginTop: '80px' },
        }}
      />

      <CartFloatingButton />
    </>
  );
}