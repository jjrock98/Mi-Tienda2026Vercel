'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/utils';
import { PACK_CONFIG } from '@/types';
import type { TipoPack } from '@/types';
import { Package2, ChevronRight, ExternalLink } from 'lucide-react';
import type { Order } from '@/types';

// ✅ Helper seguro para obtener la descripción del item
function getItemDescription(item: any): string {
  if (item.tipo_venta === 'curva') {
    return `Curva de ${item.unidades_por_item} uds × ${item.cantidad_items}`;
  } else {
    // Si es pack, aseguramos que tipo_pack exista y sea válido
    const packKey = item.tipo_pack as TipoPack;
    const packLabel = PACK_CONFIG[packKey]?.label || item.tipo_pack || 'Pack';
    return `${packLabel} × ${item.cantidad_items}`;
  }
}

export default function MisPedidosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login?redirect=/mis-pedidos');
        return;
      }
      
      // ✅ Actualizar la consulta para incluir los nuevos campos
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            nombre_snap,
            tipo_venta,
            tipo_pack,
            unidades_por_item,
            cantidad_items,
            subtotal
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    };
    fetchOrders();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Package2 size={56} className="text-muted opacity-30" />
        <p className="text-muted font-medium">No tenés pedidos aún.</p>
        <Link href="/" className="btn-primary">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold">Mis pedidos</h1>
        <span className="text-sm text-muted">
          {orders.length} pedido{orders.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="card block p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in cursor-pointer"
            onClick={() => router.push(`/mis-pedidos/${order.id}`)}
          >
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-mono text-muted">
                  #{order.id.slice(0,8).toUpperCase()}
                </p>
                <p className="text-xs text-muted mt-0.5">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${ORDER_STATUS_COLORS[order.estado]}`}>
                  {ORDER_STATUS_LABELS[order.estado]}
                </span>
                <span className="font-bold text-brand-600">{formatPrice(order.total)}</span>
                <ChevronRight size={16} className="text-muted" />
              </div>
            </div>

            {/* Items preview */}
            <div className="space-y-1 mb-3">
              {(order.order_items ?? []).slice(0, 2).map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted line-clamp-1 flex-1">
                    {item.nombre_snap} · {getItemDescription(item)}
                  </span>
                  <span className="shrink-0 ml-3">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
              {(order.order_items ?? []).length > 2 && (
                <p className="text-xs text-muted">
                  + {(order.order_items ?? []).length - 2} producto{(order.order_items ?? []).length - 2 !== 1 ? 's' : ''} más
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted">
              <span>Envío: {formatPrice(order.costo_envio)}</span>
              <span>·</span>
              <span className="capitalize">{order.metodo_pago}</span>

              {order.comprobante_url && (
                <>
                  <span>·</span>
                  <a
                    href={order.comprobante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={11} /> Comprobante
                  </a>
                </>
              )}

              {order.estado === 'pendiente' && order.metodo_pago === 'transferencia' && !order.comprobante_url && (
                <>
                  <span>·</span>
                  <Link
                    href={`/subir-comprobante?orderId=${order.id}`}
                    className="text-brand-600 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Subir comprobante →
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}