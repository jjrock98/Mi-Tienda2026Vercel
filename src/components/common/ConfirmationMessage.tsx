'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export function ConfirmationMessage() {
  const searchParams = useSearchParams();
  const confirmed = searchParams?.get('confirmed');

  useEffect(() => {
    if (confirmed === 'true') {
      toast.success('✅ Correo electrónico confirmado con éxito. ¡Bienvenido a CM Importados!', {
        duration: 5000,
        icon: '🎉',
      });
      // Limpiar la URL sin recargar
      const url = new URL(window.location.href);
      url.searchParams.delete('confirmed');
      window.history.replaceState({}, '', url.toString());
    }
  }, [confirmed]);

  return null;
}