import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RelatedProducts } from '@/components/products/RelatedProducts';
import { ProductPageClient } from '@/components/products/ProductPageClient';
import { ProductModalTrigger } from '@/components/products/ProductModalTrigger';
import { formatPrice } from '@/utils';
import { Package, ArrowLeft, Star } from 'lucide-react';
import type { Product } from '@/types';

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data } = await admin.from('products').select('slug').eq('activo', true);
  return (data ?? []).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase   = await createClient();
  const { data: product } = await supabase
    .from('products').select('*').eq('slug', params.slug).eq('activo', true).single();

  if (!product) return { title: 'Producto no encontrado' };

  const description = product.descripcion_corta ?? product.descripcion ?? `Comprá ${product.nombre} en packs de media docena o docena.`;
  const image       = product.imagenes?.[0];
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL;

  return {
    title:      product.nombre,
    description,
    alternates: { canonical: `${appUrl}/productos/${params.slug}` },
    openGraph: {
      title:       product.nombre,
      description,
      url:         `${appUrl}/productos/${params.slug}`,
      type:        'website',
      images:      image ? [{ url: image, width: 800, height: 800, alt: product.nombre }] : [],
    },
    twitter: {
      card:        'summary_large_image',
      title:       product.nombre,
      description,
      images:      image ? [image] : [],
    },
  };
}

export const revalidate = 60;

export default async function ProductoPage({ params }: Props) {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products').select('*').eq('slug', params.slug).eq('activo', true).single();

  if (!product) notFound();

  const p = product as Product;

  const maxMediaDocena = Math.floor(p.stock_unidades / 6);
  const maxDocena      = Math.floor(p.stock_unidades / 12);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'Product',
    name:        p.nombre,
    description: p.descripcion ?? p.descripcion_corta,
    image:       p.imagenes,
    sku:         p.id,
    offers: [
      {
        '@type':       'Offer',
        name:          'Media docena (6 unidades)',
        price:          p.precio_media_docena,
        priceCurrency: 'ARS',
        availability:  p.stock_unidades >= 6
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda' },
      },
      {
        '@type':       'Offer',
        name:          'Docena (12 unidades)',
        price:          p.precio_docena,
        priceCurrency: 'ARS',
        availability:  p.stock_unidades >= 12
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda' },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
          <span aria-hidden>/</span>
          <Link href="/#catalogo" className="hover:text-foreground transition-colors">Productos</Link>
          <span aria-hidden>/</span>
          <span className="text-foreground line-clamp-1" aria-current="page">{p.nombre}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Gallery */}
          <ProductPageClient images={p.imagenes} nombre={p.nombre} />

          {/* Info */}
          <div className="space-y-6">
            {p.destacado && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-400">
                <Star size={12} fill="currentColor" /> Producto destacado
              </span>
            )}

            <h1 className="font-display text-3xl font-bold leading-tight">{p.nombre}</h1>

            {p.descripcion_corta && (
              <p className="text-lg text-muted leading-relaxed">{p.descripcion_corta}</p>
            )}

            {/* Pack prices */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Media docena', unidades: 6,  precio: p.precio_media_docena, maxPacks: maxMediaDocena },
                { label: 'Docena',       unidades: 12, precio: p.precio_docena,       maxPacks: maxDocena      },
              ].map(({ label, unidades, precio, maxPacks }) => (
                <div key={label} className="card p-4 text-center">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="text-xs text-muted mb-2">{unidades} unidades</p>
                  <p className="text-xl font-bold text-brand-600">{formatPrice(precio)}</p>
                  <p className="text-xs text-muted mt-1">
                    {maxPacks > 0 ? `Hasta ${maxPacks} packs` : '❌ Sin stock'}
                  </p>
                </div>
              ))}
            </div>

            {/* Stock indicator */}
            <div className="flex items-center gap-3 text-sm">
              <Package size={16} className="text-muted" />
              <span className="text-muted">Stock disponible:</span>
              <span className={`font-semibold ${
                p.stock_unidades === 0 ? 'text-red-500' :
                p.stock_unidades < 12  ? 'text-yellow-600' : 'text-green-600'}`}>
                {p.stock_unidades} unidades
              </span>
            </div>

            {/* Colores & talles */}
            {p.colores.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Colores disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {p.colores.map((c) => <span key={c} className="badge bg-surface-2 text-sm px-3 py-1">{c}</span>)}
                </div>
              </div>
            )}
            {p.talles.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Talles disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {p.talles.map((t) => <span key={t} className="badge bg-surface-2 text-sm px-3 py-1">{t}</span>)}
                </div>
              </div>
            )}

            {/* ✅ Fixed: usa ProductModalTrigger, no ProductModal */}
            <ProductModalTrigger product={p} triggerLabel="Elegir pack y agregar al carrito" />

            {/* Description */}
            {p.descripcion && (
              <div className="border-t border-border pt-5">
                <p className="text-sm font-medium mb-2">Descripción</p>
                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{p.descripcion}</p>
              </div>
            )}

            <Link href="/#catalogo" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
              <ArrowLeft size={14} /> Ver todos los productos
            </Link>
          </div>
        </div>

        {/* Related products */}
        <RelatedProducts currentProductId={p.id} />
      </div>
    </>
  );
}
