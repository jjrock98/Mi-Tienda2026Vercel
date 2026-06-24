'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag, Minus, Plus, MapPin, Truck, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/hooks/useCart';
import { formatPrice } from '@/utils';
import { PACK_CONFIG } from '@/types';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function CarritoPage() {
  const { items, costoEnvio, removeItem, updateQuantity, setShipping, zonaEnvio } =
    useCartStore();
  const [cp, setCp] = useState(useCartStore.getState().codigoPostal);
  const [calcLoading, setCalc] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [loadingStock, setLoadingStock] = useState(true);
  const correctionApplied = useRef(false);

  // Obtener stock actualizado para cada ítem
  useEffect(() => {
    const fetchStockForItems = async () => {
      setLoadingStock(true);
      const supabase = createClient();
      const productIds = items.map(item => item.productId);
      if (productIds.length === 0) {
        setStockMap({});
        setLoadingStock(false);
        return;
      }
      const { data, error } = await supabase
        .from('products')
        .select('id, stock_unidades')
        .in('id', productIds);
      if (error) {
        console.error('Error al cargar stock:', error);
        setLoadingStock(false);
        return;
      }
      const map: Record<string, number> = {};
      data.forEach((p: any) => { map[p.id] = p.stock_unidades; });
      setStockMap(map);
      setLoadingStock(false);
    };
    fetchStockForItems();
  }, [items]);

  // ✅ AUTOCORRECCIÓN: ajustar cantidades que excedan el stock
  useEffect(() => {
    if (loadingStock || Object.keys(stockMap).length === 0 || correctionApplied.current) return;

    let needCorrection = false;
    const itemsCopy = [...items];
    for (const item of itemsCopy) {
      const stockTotal = stockMap[item.productId] ?? 0;
      const unidadesEnCarrito = itemsCopy
        .filter(i => i.productId === item.productId)
        .reduce((sum, i) => sum + i.unidades, 0);
      const stockRestante = Math.max(0, stockTotal - (unidadesEnCarrito - item.unidades));
      const unidadesPorPack = item.tipoPack === 'media_docena' ? 6 : 12;
      const maxPacks = Math.floor(stockRestante / unidadesPorPack);
      if (item.cantidadPacks > maxPacks && maxPacks >= 0) {
        needCorrection = true;
        updateQuantity(item.productId, item.tipoPack, maxPacks).then(result => {
          if (result.success) {
            toast.error(`🔄 Se ajustó la cantidad de "${item.nombre}" a ${maxPacks} packs (stock disponible)`);
          }
        });
      }
    }

    if (needCorrection) {
      correctionApplied.current = true;
      setTimeout(() => {
        correctionApplied.current = false;
        setLoadingStock(true);
        const supabase = createClient();
        const productIds = items.map(item => item.productId);
        if (productIds.length > 0) {
          supabase
            .from('products')
            .select('id, stock_unidades')
            .in('id', productIds)
            .then(({ data }) => {
              if (data) {
                const map: Record<string, number> = {};
                data.forEach((p: any) => { map[p.id] = p.stock_unidades; });
                setStockMap(map);
              }
              setLoadingStock(false);
            });
        } else {
          setLoadingStock(false);
        }
      }, 500);
    }
  }, [stockMap, loadingStock, items, updateQuantity]);

  // Calcular unidades totales por producto
  const getUnidadesEnCarrito = (productId: string) => {
    return items
      .filter(i => i.productId === productId)
      .reduce((sum, i) => sum + i.unidades, 0);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.precioUnitario * item.cantidadPacks), 0);
  const totalCalculado = subtotal + (costoEnvio || 0);

  const calcShipping = async () => {
    if (!cp.trim()) { toast.error('Ingresá un código postal'); return; }
    setCalc(true);
    const res = await fetch(`/api/shipping?cp=${cp.trim()}`);
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
      setShipping(cp, 0, '');
    } else {
      setShipping(cp, data.costo, data.zona);
      toast.success(`Envío a ${data.zona}: ${formatPrice(data.costo)}`);
    }
    setCalc(false);
  };

  const handleUpdateQuantity = async (productId: string, tipoPack: any, newCantidad: number) => {
    if (newCantidad <= 0) {
      await removeItem(productId, tipoPack);
      toast('Producto eliminado');
      return;
    }

    const result = await updateQuantity(productId, tipoPack, newCantidad);
    if (!result.success) {
      toast.error(result.error || 'No se pudo actualizar la cantidad');
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag size={56} className="text-muted opacity-30" />
        <p className="text-lg font-semibold text-muted">Tu carrito está vacío</p>
        <Link href="/" className="btn-primary">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-8">Mi carrito</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const stockTotal = stockMap[item.productId] ?? 0;
            const unidadesEnCarrito = getUnidadesEnCarrito(item.productId);
            const stockRestante = Math.max(0, stockTotal - (unidadesEnCarrito - item.unidades));
            const unidadesPorPack = item.tipoPack === 'media_docena' ? 6 : 12;
            const maxPacks = Math.floor(stockRestante / unidadesPorPack);
            const isStockOk = item.cantidadPacks <= maxPacks && stockRestante >= 0;

            return (
              <div
                key={`${item.productId}-${item.tipoPack}`}
                className={`card flex gap-4 p-4 animate-fade-in ${!isStockOk ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/10' : ''}`}
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {item.imagen ? (
                    <Image src={item.imagen} alt={item.nombre} fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <ShoppingBag size={24} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight line-clamp-2">{item.nombre}</p>
                  <p className="text-xs text-muted mt-0.5">{PACK_CONFIG[item.tipoPack].label}</p>
                  <p className="text-xs text-muted">{item.unidades} unidades · {formatPrice(item.precioUnitario)}/pack</p>

                  {!isStockOk && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                      <AlertCircle size={12} />
                      <span>Stock insuficiente (disponible: {stockRestante} uds)</span>
                    </div>
                  )}
                  {isStockOk && stockRestante < 12 && stockRestante > 0 && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600 mt-1">
                      <AlertCircle size={12} />
                      <span>¡Últimas {stockRestante} unidades disponibles!</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, item.tipoPack, item.cantidadPacks - 1)}
                        className="rounded-lg border p-1 hover:bg-surface-2 disabled:opacity-40"
                        disabled={item.cantidadPacks <= 1 || loadingStock}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.cantidadPacks}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, item.tipoPack, item.cantidadPacks + 1)}
                        className="rounded-lg border p-1 hover:bg-surface-2 disabled:opacity-40"
                        disabled={
                          loadingStock ||
                          item.cantidadPacks >= maxPacks ||
                          maxPacks <= 0 ||
                          !isStockOk
                        }
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-brand-600">{formatPrice(item.precioUnitario * item.cantidadPacks)}</span>
                    {loadingStock && <span className="text-xs text-muted">...</span>}
                  </div>
                </div>

                <button
                  onClick={() => { removeItem(item.productId, item.tipoPack); toast('Producto eliminado'); }}
                  className="text-muted hover:text-red-500 transition-colors p-1 self-start"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Truck size={16} className="text-brand-500" /> Calcular envío
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={cp}
                  onChange={(e) => setCp(e.target.value)}
                  placeholder="Código postal"
                  className="input-base pl-9 py-2 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && calcShipping()}
                />
              </div>
              <button
                onClick={calcShipping}
                disabled={calcLoading}
                className="btn-secondary px-3 py-2 text-xs whitespace-nowrap"
              >
                {calcLoading ? '…' : 'Calcular'}
              </button>
            </div>
            {zonaEnvio && (
              <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                Zona: {zonaEnvio} · {formatPrice(costoEnvio)}
              </p>
            )}
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="font-semibold">Resumen</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Envío</span>
              <span>{zonaEnvio ? formatPrice(costoEnvio) : '—'}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-brand-600 text-lg">{formatPrice(totalCalculado)}</span>
            </div>
            <Link href="/checkout" className="btn-primary w-full mt-2 text-center">
              Ir a pagar
            </Link>
            <Link href="/" className="btn-ghost w-full text-center text-sm">
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}