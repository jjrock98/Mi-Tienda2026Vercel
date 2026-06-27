'use client';
import { useCartStore } from '@/hooks/useCart';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CartItem } from '@/types';

export function CartFloatingButton() {
  const items = useCartStore((state) => state.items);
  const pathname = usePathname();

  // ✅ No mostrar en las páginas de carrito ni checkout
  if (pathname === '/carrito' || pathname === '/checkout') {
    return null;
  }

  const totalItems = items.reduce((acc: number, item: CartItem) => acc + item.cantidadItems, 0);

  if (totalItems === 0) return null;

  return (
    <Link
      href="/carrito"
      className="fixed bottom-20 right-4 z-[999999] flex items-center justify-center rounded-full bg-brand-600 p-3.5 shadow-lg transition-all hover:bg-brand-700 hover:scale-105 active:scale-95 lg:hidden"
      aria-label="Ver carrito"
    >
      <ShoppingBag size={22} className="text-white" />
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
        {totalItems > 9 ? '9+' : totalItems}
      </span>
    </Link>
  );
}