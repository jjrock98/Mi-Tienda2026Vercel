'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Heart, Package } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn, formatPrice } from '@/utils';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import type { Product } from '@/types';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

const ProductModal = dynamic(
  () => import('@/components/products/ProductModal').then((mod) => mod.ProductModal),
  { ssr: false }
);

interface Props { product: Product }

export function ProductCard({ product: p }: Props) {
  const { isInWishlist, toggle } = useWishlist();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const inWishlist = isInWishlist(p.id);

  // ── Stock en tiempo real (polling) ──
  const [stockReal, setStockReal] = useState(p.stock_unidades);

  useEffect(() => {
    const supabase = createClient();
    let interval: NodeJS.Timeout;

    const fetchStock = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('stock_unidades')
        .eq('id', p.id)
        .single();
      if (!error && data) {
        setStockReal(data.stock_unidades);
      }
    };

    // Carga inicial
    fetchStock();

    // Polling cada 5 segundos
    interval = setInterval(fetchStock, 5000);

    // Opcional: suscripción Realtime (comentar si no se usa)
    // const channel = supabase
    //   .channel(`product-${p.id}`)
    //   .on(
    //     'postgres_changes',
    //     { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${p.id}` },
    //     (payload) => {
    //       setStockReal(payload.new.stock_unidades);
    //     }
    //   )
    //   .subscribe();
    // return () => {
    //   clearInterval(interval);
    //   supabase.removeChannel(channel);
    // };

    return () => clearInterval(interval);
  }, [p.id]);

  // Usar stockReal para todos los cálculos
  const maxMediaDocena = Math.floor(stockReal / 6);
  const maxDocena      = Math.floor(stockReal / 12);
  const sinStock       = stockReal === 0;

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('Ingresá para guardar en wishlist'); return; }
    toggle(p.id);
  };

  const handleAddCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sinStock) setModalOpen(true);
  };

  return (
    <>
      <article className="card-hover group relative overflow-hidden">
        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          aria-label={inWishlist ? 'Quitar de wishlist' : 'Agregar a wishlist'}
          className={cn(
            'absolute right-3 top-3 z-10 rounded-full p-1.5 backdrop-blur-sm transition-all',
            inWishlist
              ? 'bg-red-500 text-white'
              : 'bg-white/80 text-gray-500 opacity-0 group-hover:opacity-100 dark:bg-black/60'
          )}
        >
          <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
        </button>

        <Link
          href={`/productos/${p.slug}`}
          className="relative block overflow-hidden bg-surface-2"
          style={{ aspectRatio: '1/1' }}
          tabIndex={0}
          aria-label={`Ver detalle de ${p.nombre}`}
        >
          {p.imagenes[0] ? (
            <Image
              src={p.imagenes[0]}
              alt={p.nombre}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              <Package size={40} />
            </div>
          )}

          {sinStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-800">
                Sin stock
              </span>
            </div>
          )}
          {p.destacado && (
            <span className="absolute left-2 top-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
              Destacado
            </span>
          )}
        </Link>

        <div className="p-4">
          <Link href={`/productos/${p.slug}`}>
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight hover:text-brand-600 transition-colors">
              {p.nombre}
            </h3>
          </Link>
          {p.descripcion_corta && (
            <p className="mt-1 line-clamp-1 text-xs text-muted">{p.descripcion_corta}</p>
          )}

          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">½ docena (6)</span>
              <span className="text-sm font-bold text-brand-600">{formatPrice(p.precio_media_docena)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Docena (12)</span>
              <span className="text-sm font-bold text-brand-600">{formatPrice(p.precio_docena)}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Package size={11} />
            <span>
              Stock: <span className={sinStock ? 'text-red-500 font-semibold' : ''}>{stockReal}</span>
              {' '}— hasta {maxMediaDocena} ½doc / {maxDocena} doc
            </span>
          </div>

          <button
            onClick={handleAddCart}
            disabled={sinStock}
            className="btn-primary mt-4 w-full py-2 text-xs disabled:opacity-50"
            aria-label={sinStock ? `${p.nombre} sin stock` : `Agregar ${p.nombre} al carrito`}
          >
            {sinStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>
        </div>
      </article>

      {modalOpen && (
        <ProductModal product={{ ...p, stock_unidades: stockReal }} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}