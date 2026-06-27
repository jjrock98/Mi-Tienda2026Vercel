'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Heart, Package, Play, ChevronLeft, ChevronRight } from 'lucide-react';
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

    fetchStock();
    interval = setInterval(fetchStock, 5000);

    return () => clearInterval(interval);
  }, [p.id]);

  const esCurva = p.tipo_venta === 'curva';
  const unidadesCurva = esCurva ? (p.unidades_curva ?? 1) : 1;
  const curvasDisponibles = esCurva ? Math.floor(stockReal / unidadesCurva) : 0;

  const maxMediaDocena = Math.floor(stockReal / 6);
  const maxDocena      = Math.floor(stockReal / 12);
  const sinStock       = stockReal === 0;

  // ── Carrusel de imágenes + video ──
  const items = [
    // Primera imagen
    ...(p.imagenes.length > 0 ? [{ type: 'image' as const, src: p.imagenes[0] }] : []),
    // Video (si existe)
    ...(p.video_url ? [{ type: 'video' as const, src: p.video_url }] : []),
    // Resto de imágenes (a partir de la segunda)
    ...p.imagenes.slice(1).map((img) => ({ type: 'image' as const, src: img })),
  ];

  const [current, setCurrent] = useState(0);
  const total = items.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  const currentItem = items[current] || { type: 'image', src: '' };
  const isVideo = currentItem.type === 'video';

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
          className="relative block bg-surface-2"
          style={{ aspectRatio: '1/1' }}
          tabIndex={0}
          aria-label={`Ver detalle de ${p.nombre}`}
        >
          {/* 🎬 Badge "Video" si existe video_url */}
          {p.video_url && (
            <span className="absolute top-2 left-2 z-30 rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-md pointer-events-none">
              🎬 Video
            </span>
          )}

          {/* Contenido del carrusel */}
          {total === 0 ? (
            <div className="flex h-full items-center justify-center text-muted">
              <Package size={40} />
            </div>
          ) : isVideo ? (
            <div className="video-container w-full h-full">
              <iframe
                src={`https://fast.wistia.net/embed/iframe/${currentItem.src}`}
                title={`Video de ${p.nombre}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <Image
              src={currentItem.src}
              alt={p.nombre}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* ✅ CONTROLES DE NAVEGACIÓN SIEMPRE VISIBLES */}
          {total > 1 && (
            <>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-black/80 p-2 shadow-lg z-50 border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ opacity: 1, visibility: 'visible' }}
                aria-label="Anterior"
              >
                <ChevronLeft size={20} className="text-gray-800 dark:text-white" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-black/80 p-2 shadow-lg z-50 border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ opacity: 1, visibility: 'visible' }}
                aria-label="Siguiente"
              >
                <ChevronRight size={20} className="text-gray-800 dark:text-white" />
              </button>
            </>
          )}

          {/* Indicador de video (si el item actual es video) */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
                <Play size={24} className="text-white" fill="white" />
              </div>
            </div>
          )}

          {/* Dots (indicadores) */}
          {total > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-40">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                  )}
                  aria-label={`Ir a item ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Sin stock / Destacado */}
          {sinStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-800">
                Sin stock
              </span>
            </div>
          )}
          {p.destacado && (
            <span className="absolute left-2 top-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white pointer-events-none">
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
            {esCurva ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Curva de {unidadesCurva} uds</span>
                <span className="text-sm font-bold text-brand-600">{formatPrice(p.precio_curva ?? 0)}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">½ docena (6)</span>
                  <span className="text-sm font-bold text-brand-600">{formatPrice(p.precio_media_docena)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Docena (12)</span>
                  <span className="text-sm font-bold text-brand-600">{formatPrice(p.precio_docena)}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Package size={11} />
            <span>
              Stock: <span className={sinStock ? 'text-red-500 font-semibold' : ''}>{stockReal}</span>
              {' '}— {esCurva ? (
                `máx. ${curvasDisponibles} curvas`
              ) : (
                `hasta ${maxMediaDocena} ½doc / ${maxDocena} doc`
              )}
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