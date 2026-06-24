'use client';
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Product } from '@/types';

// ✅ Carga dinámica para evitar problemas de SSR/SSG
const ProductModal = dynamic(
  () => import('@/components/products/ProductModal').then((mod) => mod.ProductModal),
  { ssr: false }
);

interface Props {
  product:      Product;
  triggerLabel?: string;
}

export function ProductModalTrigger({ product, triggerLabel }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={product.stock_unidades === 0}
        className="btn-primary w-full gap-2 py-3 text-base disabled:opacity-50"
      >
        <ShoppingCart size={18} />
        {product.stock_unidades === 0 ? 'Sin stock disponible' : (triggerLabel ?? 'Agregar al carrito')}
      </button>

      {open && <ProductModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}