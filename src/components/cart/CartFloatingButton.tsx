'use client';
import { useCartStore } from '@/hooks/useCart';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CartItem } from '@/types';

// ✅ Rutas exactas donde NO se debe mostrar el botón flotante
const EXACT_HIDDEN_ROUTES = [
  '/carrito',
  '/checkout',
  '/pago/exitoso',
  '/pago/error',
  '/pago/pendiente',
  '/mis-pedidos',
  '/wishlist',
  '/completar-perfil',
  '/mantenimiento',
];

// ✅ Prefijos de rutas donde NO se debe mostrar el botón flotante
const PREFIX_HIDDEN_ROUTES = [
  '/auth/',      // auth/login, auth/registro, auth/verificar, etc.
  '/admin/',     // admin/pedidos, admin/productos, admin/configuracion, etc.
  '/mis-pedidos/', // mis-pedidos/[id], etc.
  '/pago/',      // pago/exitoso, pago/error, pago/pendiente (ya cubiertos, pero por si acaso)
  '/checkout/',  // checkout/success, checkout/failure, checkout/pending (ya cubiertos)
];

export function CartFloatingButton() {
  const items = useCartStore((state) => state.items);
  const pathname = usePathname();

  // ✅ Si pathname es null o undefined, no mostrar (seguridad)
  if (!pathname) {
    return null;
  }

  // ✅ Ocultar en rutas exactas
  if (EXACT_HIDDEN_ROUTES.includes(pathname)) {
    return null;
  }

  // ✅ Ocultar en rutas que empiezan con ciertos prefijos
  if (PREFIX_HIDDEN_ROUTES.some((prefix) => pathname.startsWith(prefix))) {
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