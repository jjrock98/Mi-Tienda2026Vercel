'use client';
import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, Package } from 'lucide-react';
import { cn, formatPrice } from '@/utils';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

export function ProductFilters({ products }: Props) {
  const [search, setSearch] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [tipoVenta, setTipoVenta] = useState<'todas' | 'pack' | 'curva'>('todas');
  const [maxPrice, setMaxPrice] = useState<number>(
    Math.max(
      250000,
      ...products.map(p => {
        if (p.tipo_venta === 'curva') return p.precio_curva ?? 0;
        return Math.max(p.precio_media_docena, p.precio_docena);
      })
    )
  );
  const [sortBy, setSortBy] = useState('relevancia');

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q) ||
        p.descripcion_corta?.toLowerCase().includes(q) ||
        p.colores.some(c => c.toLowerCase().includes(q)) ||
        p.talles.some(t => t.toLowerCase().includes(q))
      );
    }

    if (onlyInStock) {
      result = result.filter(p => p.stock_unidades > 0);
    }

    if (tipoVenta !== 'todas') {
      result = result.filter(p => p.tipo_venta === tipoVenta);
    }

    result = result.filter(p => {
      let price = 0;
      if (p.tipo_venta === 'curva') {
        price = p.precio_curva ?? 0;
      } else {
        price = Math.min(p.precio_media_docena, p.precio_docena);
      }
      return price <= maxPrice;
    });

    switch (sortBy) {
      case 'precio_asc':
        result.sort((a, b) => {
          const priceA = a.tipo_venta === 'curva' ? (a.precio_curva ?? 0) : Math.min(a.precio_media_docena, a.precio_docena);
          const priceB = b.tipo_venta === 'curva' ? (b.precio_curva ?? 0) : Math.min(b.precio_media_docena, b.precio_docena);
          return priceA - priceB;
        });
        break;
      case 'precio_desc':
        result.sort((a, b) => {
          const priceA = a.tipo_venta === 'curva' ? (a.precio_curva ?? 0) : Math.min(a.precio_media_docena, a.precio_docena);
          const priceB = b.tipo_venta === 'curva' ? (b.precio_curva ?? 0) : Math.min(b.precio_media_docena, b.precio_docena);
          return priceB - priceA;
        });
        break;
      case 'nombre_asc':
        result.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'nombre_desc':
        result.sort((a, b) => b.nombre.localeCompare(a.nombre));
        break;
      case 'stock_asc':
        result.sort((a, b) => a.stock_unidades - b.stock_unidades);
        break;
      case 'stock_desc':
        result.sort((a, b) => b.stock_unidades - a.stock_unidades);
        break;
      default:
        result.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
        break;
    }

    return result;
  }, [products, search, onlyInStock, tipoVenta, maxPrice, sortBy]);

  const maxPriceLimit = useMemo(() => {
    return Math.max(
      250000,
      ...products.map(p => {
        if (p.tipo_venta === 'curva') return p.precio_curva ?? 0;
        return Math.max(p.precio_media_docena, p.precio_docena);
      })
    );
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos, colores, talles..."
            className="input-base pl-9 py-2.5 w-full"
          />
        </div>

        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium hover:text-brand-600 transition-colors">
            <Filter size={16} />
            Filtros
            <ChevronDown size={14} className="ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-4 p-4 bg-surface-2 rounded-xl">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="accent-brand-500 h-4 w-4"
              />
              Solo con stock disponible
            </label>

            <div>
              <p className="text-xs font-medium text-muted mb-2">Tipo de venta</p>
              <div className="flex gap-2">
                {[
                  { id: 'todas', label: 'Todas' },
                  { id: 'pack', label: '📦 Packs' },
                  { id: 'curva', label: '🔀 Curvas' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTipoVenta(opt.id as typeof tipoVenta)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                      tipoVenta === opt.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400'
                        : 'border-border text-muted hover:border-brand-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted">Precio máximo</p>
                <span className="text-xs font-semibold">${formatPrice(maxPrice)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={maxPriceLimit}
                step={1000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>
        </details>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
          </p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-base py-1.5 text-sm w-auto"
          >
            <option value="relevancia">Relevancia</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="nombre_asc">Nombre: A - Z</option>
            <option value="nombre_desc">Nombre: Z - A</option>
            <option value="stock_desc">Mayor stock primero</option>
            <option value="stock_asc">Menor stock primero</option>
          </select>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-20 text-center text-muted">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay productos que coincidan con los filtros.</p>
          <button
            onClick={() => {
              setSearch('');
              setOnlyInStock(false);
              setTipoVenta('todas');
              setMaxPrice(maxPriceLimit);
              setSortBy('relevancia');
            }}
            className="mt-4 text-sm text-brand-600 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}