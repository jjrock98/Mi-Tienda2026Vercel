'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ShoppingCart, Minus, Plus, Package } from 'lucide-react';
import { cn, formatPrice } from '@/utils';
import { useCartStore } from '@/hooks/useCart';
import type { Product, TipoPack } from '@/types';
import { PACK_CONFIG } from '@/types';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Props {
  product: Product;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: Props) {
  const { items, addItem } = useCartStore((s) => ({
    items: s.items,
    addItem: s.addItem,
  }));

  const esCurva = product.tipo_venta === 'curva';

  // Estados para packs
  const [tipoPack, setTipoPack] = useState<TipoPack>('media_docena');
  const [cantidadPacks, setCantidadPacks] = useState(1);

  // Estados para curva
  const [cantidadCurvas, setCantidadCurvas] = useState(1);

  const [imgIndex, setImgIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stockTotal, setStockTotal] = useState<number>(product.stock_unidades);

  useEffect(() => {
    const fetchStock = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .select('stock_unidades')
        .eq('id', product.id)
        .single();
      if (!error && data) {
        setStockTotal(data.stock_unidades);
      }
    };
    fetchStock();
  }, [product.id, items]);

  const unidadesEnCarrito = items
    .filter((i) => i.productId === product.id)
    .reduce((sum, i) => sum + i.unidades, 0);

  const stockRestante = Math.max(0, stockTotal - unidadesEnCarrito);

  // Cálculos para packs
  const maxMediaDocena = Math.floor(stockRestante / 6);
  const maxDocena = Math.floor(stockRestante / 12);
  const maxCantidadPacks = tipoPack === 'media_docena' ? maxMediaDocena : maxDocena;

  // Cálculos para curva
  const unidadesCurva = product.unidades_curva ?? 1;
  const maxCurvas = Math.floor(stockRestante / unidadesCurva);

  // Precio según tipo
  const precioPack = tipoPack === 'media_docena' ? product.precio_media_docena : product.precio_docena;
  const precioCurva = product.precio_curva ?? 0;

  // Totales
  const totalUnidades = esCurva
    ? cantidadCurvas * unidadesCurva
    : cantidadPacks * (tipoPack === 'media_docena' ? 6 : 12);
  const totalPrecio = esCurva
    ? cantidadCurvas * precioCurva
    : cantidadPacks * precioPack;

  // Efecto para resetear cantidades cuando cambia el stock
  useEffect(() => {
    if (esCurva) {
      setCantidadCurvas((c) => Math.min(c, maxCurvas || 1));
    } else {
      setCantidadPacks((c) => Math.min(c, maxCantidadPacks || 1));
    }
  }, [esCurva, maxCurvas, maxCantidadPacks]);

  const handleAdd = async () => {
    if (esCurva) {
      if (maxCurvas === 0) {
        toast.error('No hay stock suficiente para una curva');
        return;
      }
    } else {
      if (maxCantidadPacks === 0) {
        toast.error('No hay stock disponible para este pack');
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('stock_unidades')
      .eq('id', product.id)
      .single();

    if (error || !data) {
      toast.error('Error al verificar stock. Intenta nuevamente.');
      setLoading(false);
      return;
    }

    const stockActual = data.stock_unidades;
    const unidadesActualesEnCarrito = items
      .filter((i) => i.productId === product.id)
      .reduce((sum, i) => sum + i.unidades, 0);
    const stockRestanteActual = Math.max(0, stockActual - unidadesActualesEnCarrito);

    const unidadesSolicitadas = esCurva
      ? cantidadCurvas * unidadesCurva
      : cantidadPacks * (tipoPack === 'media_docena' ? 6 : 12);

    if (unidadesSolicitadas > stockRestanteActual) {
      toast.error(`Stock insuficiente. Disponible: ${stockRestanteActual} unidades`);
      setLoading(false);
      return;
    }

    // Preparar datos para el carrito
    const itemData = esCurva ? {
      productId: product.id,
      productSlug: product.slug,
      nombre: product.nombre,
      imagen: product.imagenes[0] ?? '',
      tipoVenta: 'curva' as const,
      unidadesPorItem: unidadesCurva,
      cantidadItems: cantidadCurvas,
      unidades: unidadesSolicitadas,
      precioUnitario: precioCurva,
    } : {
      productId: product.id,
      productSlug: product.slug,
      nombre: product.nombre,
      imagen: product.imagenes[0] ?? '',
      tipoVenta: 'pack' as const,
      tipoPack: tipoPack,
      unidadesPorItem: tipoPack === 'media_docena' ? 6 : 12,
      cantidadItems: cantidadPacks,
      unidades: unidadesSolicitadas,
      precioUnitario: precioPack,
    };

    const result = await addItem(itemData as any); // el tipado se ajusta en el store

    if (result.success) {
      const label = esCurva
        ? `Curva de ${unidadesCurva} unidades`
        : PACK_CONFIG[tipoPack].label;
      toast.success(`${esCurva ? cantidadCurvas : cantidadPacks} ${label} agregado${(esCurva ? cantidadCurvas : cantidadPacks) > 1 ? 's' : ''} al carrito`);
      onClose();
    } else {
      toast.error(result.error || 'No se pudo agregar al carrito');
    }

    setLoading(false);
  };

  // Eliminar duplicados de colores y talles con Set
  const uniqueColores = product.colores ? [...new Set(product.colores)] : [];
  const uniqueTalles = product.talles ? [...new Set(product.talles)] : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 hover:bg-surface-2 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="bg-surface-2 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden">
            <div className="relative aspect-square">
              {product.imagenes[imgIndex] ? (
                <Image
                  src={product.imagenes[imgIndex]}
                  alt={product.nombre}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted">
                  <Package size={60} />
                </div>
              )}
            </div>
            {product.imagenes.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {product.imagenes.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={cn(
                      'relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                      imgIndex === i ? 'border-brand-500' : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <Image src={img} alt="" fill className="object-cover" sizes="56px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">{product.nombre}</h2>
              {product.descripcion && (
                <p className="mt-2 text-sm text-muted leading-relaxed">{product.descripcion}</p>
              )}
            </div>

            <div className="rounded-xl bg-surface-2 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Stock disponible</span>
                <span className="font-semibold">{stockRestante} unidades</span>
              </div>
              {unidadesEnCarrito > 0 && (
                <div className="flex justify-between text-xs text-muted">
                  <span>Ya tienes en el carrito</span>
                  <span>{unidadesEnCarrito} uds</span>
                </div>
              )}
              {esCurva ? (
                <div className="flex justify-between">
                  <span className="text-muted">Curvas disponibles</span>
                  <span className="font-semibold">{maxCurvas}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted">Máx. media docena</span>
                    <span className="font-semibold">{maxMediaDocena} packs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Máx. docena</span>
                    <span className="font-semibold">{maxDocena} packs</span>
                  </div>
                </>
              )}
            </div>

            {uniqueColores.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Colores</p>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueColores.map((c) => (
                    <span key={c} className="badge bg-surface-2 text-foreground">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {uniqueTalles.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Talles</p>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueTalles.map((t) => (
                    <span key={t} className="badge bg-surface-2 text-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {esCurva ? (
              // Modo curva
              <div>
                <p className="text-xs font-medium mb-2">Curva de {unidadesCurva} unidades</p>
                <div className="rounded-xl border-2 border-brand-500 bg-brand-50 dark:bg-brand-950/30 p-3 text-center">
                  <p className="text-2xl font-bold text-brand-600">{formatPrice(precioCurva)}</p>
                  <p className="text-xs text-muted mt-1">
                    {product.precio_unitario_orientativo && (
                      <>({formatPrice(product.precio_unitario_orientativo)} por unidad)</>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              // Modo packs
              <div>
                <p className="text-xs font-medium mb-2">Tipo de pack</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['media_docena', 'docena'] as TipoPack[]).map((t) => {
                    const max = t === 'media_docena' ? maxMediaDocena : maxDocena;
                    const price = t === 'media_docena' ? product.precio_media_docena : product.precio_docena;
                    const disabled = max === 0;
                    return (
                      <button
                        key={t}
                        disabled={disabled}
                        onClick={() => setTipoPack(t)}
                        className={cn(
                          'rounded-xl border-2 p-3 text-left transition-all text-sm',
                          tipoPack === t
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                            : 'border-border hover:border-brand-300',
                          disabled && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <p className="font-semibold">{PACK_CONFIG[t].label}</p>
                        <p className="text-brand-600 font-bold">{formatPrice(price)}</p>
                        {disabled && (
                          <p className="text-xs text-red-500 mt-1">Sin stock</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selector de cantidad */}
            <div className="flex items-center gap-4">
              <p className="text-xs font-medium">Cantidad</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (esCurva) {
                      setCantidadCurvas(Math.max(1, cantidadCurvas - 1));
                    } else {
                      setCantidadPacks(Math.max(1, cantidadPacks - 1));
                    }
                  }}
                  className="rounded-lg border p-1.5 hover:bg-surface-2 disabled:opacity-40"
                  disabled={esCurva ? cantidadCurvas <= 1 : cantidadPacks <= 1}
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-semibold">
                  {esCurva ? cantidadCurvas : cantidadPacks}
                </span>
                <button
                  onClick={() => {
                    if (esCurva) {
                      setCantidadCurvas(Math.min(maxCurvas, cantidadCurvas + 1));
                    } else {
                      setCantidadPacks(Math.min(maxCantidadPacks, cantidadPacks + 1));
                    }
                  }}
                  className="rounded-lg border p-1.5 hover:bg-surface-2 disabled:opacity-40"
                  disabled={esCurva ? cantidadCurvas >= maxCurvas : cantidadPacks >= maxCantidadPacks}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-brand-50 dark:bg-brand-950/20 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Total unidades</span>
                <span className="font-semibold">{totalUnidades} uds</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted">Total a pagar</span>
                <span className="text-lg font-bold text-brand-600">{formatPrice(totalPrecio)}</span>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={
                (esCurva ? maxCurvas === 0 : maxCantidadPacks === 0) || loading
              }
              className="btn-primary w-full"
            >
              {loading ? (
                'Verificando stock...'
              ) : (
                <>
                  <ShoppingCart size={16} />
                  {(esCurva ? maxCurvas === 0 : maxCantidadPacks === 0)
                    ? 'Sin stock'
                    : 'Agregar al carrito'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ AGREGADO: export default para dynamic import
export default ProductModal;