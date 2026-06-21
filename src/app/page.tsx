import { createClient } from '@/lib/supabase/server';
import { ProductFilters } from '@/components/products/ProductFilters';
import type { Product } from '@/types';
import type { Metadata } from 'next';
import { ShoppingBag, Truck, Shield, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Inicio – Catálogo de productos',
  description: 'Comprá por packs de media docena o docena. Los mejores productos con envíos a todo el país.',
};

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('activo', true)
    .order('destacado', { ascending: false })
    .order('created_at', { ascending: false });

  const productList = (products ?? []) as Product[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda',
    url: process.env.NEXT_PUBLIC_APP_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${process.env.NEXT_PUBLIC_APP_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
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

      {/* Features */}
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

      {/* Catalog with filters */}
      <section id="catalogo" className="mx-auto max-w-7xl px-4 pb-20">
        <h2 className="font-display text-3xl font-bold mb-6">Catálogo</h2>
        {productList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center text-muted">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay productos disponibles aún.</p>
          </div>
        ) : (
          <ProductFilters products={productList} />
        )}
      </section>
    </>
  );
}
