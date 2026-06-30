'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import type { Product } from '@/types';
import { ShoppingBag, Truck, Shield, Star } from 'lucide-react';

// ✅ Carga dinámica de ProductFilters
const ProductFilters = dynamic(
  () => import('@/components/products/ProductFilters'),
  { ssr: false }
);

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('activo', true)
        .order('destacado', { ascending: false })
        .order('created_at', { ascending: false });
      setProducts(data ?? []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 animate-pulse">
        {/* Hero skeleton */}
        <div className="mb-12 flex flex-col items-center gap-4">
          <div className="h-10 w-96 max-w-full rounded-2xl bg-surface-2" />
          <div className="h-5 w-64 rounded-xl bg-surface-2" />
          <div className="h-10 w-36 rounded-xl bg-surface-2" />
        </div>
        {/* Feature cards skeleton */}
        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="h-6 w-6 rounded-lg bg-surface-2" />
              <div className="h-4 w-3/4 rounded-lg bg-surface-2" />
              <div className="h-3 w-full rounded-lg bg-surface-2" />
            </div>
          ))}
        </div>
        {/* Product grid skeleton */}
        <div className="h-7 w-48 rounded-xl bg-surface-2 mb-6" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-square bg-surface-2" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-full rounded-lg bg-surface-2" />
                <div className="h-3 w-2/3 rounded-lg bg-surface-2" />
                <div className="h-5 w-1/2 rounded-lg bg-surface-2 mt-3" />
                <div className="h-9 w-full rounded-xl bg-surface-2 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/20 dark:to-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl animate-slide-up">
            La tienda que <span className="text-brand-600">te viste</span>
          </h1>
          <p className="mt-4 text-lg text-muted max-w-xl mx-auto animate-fade-in">
            Comprá por packs de media docena o docena. Mejor precio, mejor calidad.
          </p>
          <a href="#catalogo" className="btn-primary mt-8 inline-flex animate-slide-up">
            <ShoppingBag size={18} /> Ver catálogo
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Truck,       title: 'Envíos a todo el país',  desc: 'Calculamos el costo por CP' },
            { icon: Shield,      title: 'Compra segura',          desc: 'MP, tarjeta o transferencia' },
            { icon: Star,        title: 'Productos de calidad',   desc: 'Seleccionados con cuidado'  },
            { icon: ShoppingBag, title: 'Packs convenientes',     desc: 'Media docena y docena'      },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-4 text-center">
              <Icon size={24} className="mx-auto text-brand-500" />
              <p className="mt-2 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl px-4 pb-20">
        <h2 className="font-display text-3xl font-bold mb-6">Catálogo</h2>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center text-muted">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay productos disponibles aún.</p>
          </div>
        ) : (
          <ProductFilters products={products} />
        )}
      </section>
    </>
  );
}