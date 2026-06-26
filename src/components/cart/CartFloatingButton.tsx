'use client';

import { useCartStore } from '@/hooks/useCart';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import type { CartItem } from '@/types';

export function CartFloatingButton() {
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((acc: number, item: CartItem) => acc + item.cantidadPacks, 0);

  // No se muestra si el carrito está vacío
  if (totalItems === 0) return null;

  return (
    <Link
      href="/carrito"
      // ✅ Clase corregida: sin conflicto entre block y flex
      className="fixed bottom-6 right-6 z-50 lg:hidden flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-90"
      aria-label="Ir al carrito"
    >
      <ShoppingCart size={24} />
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        {totalItems}
      </span>
    </Link>
  );
}