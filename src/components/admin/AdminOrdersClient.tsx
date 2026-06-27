'use client';
import { useState, useCallback, useEffect } from 'react';
import { formatPrice, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/utils';
import { PACK_CONFIG } from '@/types';
import type { Order, OrderEstado, TipoPack } from '@/types';
import {
  ExternalLink, ChevronDown, Search, CheckCircle, XCircle,
  FileCheck, Clock, Loader2, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils';
import toast from 'react-hot-toast';

const ESTADOS: OrderEstado[] = ['pendiente','pendiente_pago','pagado','procesando','enviado','entregado','cancelado'];

interface Props { initialOrders: Order[] }

// ✅ Helper para obtener descripción de un item de pedido
function getItemDescription(item: any): string {
  if (item.tipo_venta === 'curva') {
    return `Curva de ${item.unidades_por_item} uds`;
  }
  // Si es pack, aseguramos que tipo_pack exista
  const packKey = item.tipo_pack as TipoPack;
  const packLabel = PACK_CONFIG[packKey]?.label || item.tipo_pack || 'Pack';
  return packLabel;
}

export function AdminOrdersClient({ initialOrders }: Props) {
  const [orders,   setOrders]   = useState<Order[]>(initialOrders);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<string>('todos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading,  setLoading]  = useState<string | null>(null);

  // ── Reject modal state ──────────────────────────────────────
  const [rejectModal, setRejectModal] = useState<{ orderId: string } | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');

  // ── Polling para actualizar pedidos (reemplazo de Realtime) ──
  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();
        if (isMounted && data.orders) {
          setOrders(data.orders);
        }
      } catch (error) {
        console.error('Error polling orders:', error);
      }
    };

    fetchOrders(); // primera carga
    const interval = setInterval(fetchOrders, 10000); // cada 10 segundos

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const filtered = orders.filter((o) => {
    const matchFilter = filter === 'todos' || o.estado === filter;
    const matchSearch = !search ||
      o.nombre.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      o.id.slice(0,8).toUpperCase().includes(search.toUpperCase());
    return matchFilter && matchSearch;
  });

  // Counts for filter tabs
  const pendingComprobanteCount = orders.filter(
    (o) => o.metodo_pago === 'transferencia' && o.comprobante_url && !o.comprobante_revisado
  ).length;

  const updateStatus = async (orderId: string, estado: OrderEstado) => {
    setLoading(orderId);
    const res  = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, estado }),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); }
    else { setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, estado } : o)); toast.success('Estado actualizado'); }
    setLoading(null);
  };

  const approveTransfer = async (orderId: string) => {
    setLoading(orderId);
    const res  = await fetch(`/api/admin/orders/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId }),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); }
    else {
      setOrders((prev) => prev.map((o) =>
        o.id === orderId ? { ...o, estado: 'pagado', stock_descontado: true, comprobante_revisado: true } : o
      ));
      toast.success('✅ Pago aprobado y stock descontado');
    }
    setLoading(null);
  };

  const rejectTransfer = async () => {
    if (!rejectModal || !rejectMotivo.trim()) { toast.error('Ingresá el motivo'); return; }
    setLoading(rejectModal.orderId);
    const res  = await fetch(`/api/admin/orders/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rejectModal.orderId, motivo: rejectMotivo }),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); }
    else {
      setOrders((prev) => prev.map((o) =>
        o.id === rejectModal.orderId
          ? { ...o, estado: 'cancelado', comprobante_revisado: true, rejection_reason: rejectMotivo }
          : o
      ));
      toast.success('❌ Comprobante rechazado — cliente notificado');
      setRejectModal(null);
      setRejectMotivo('');
    }
    setLoading(null);
  };

  const markPaidWithStock = async (orderId: string) => {
    setLoading(orderId);
    const res  = await fetch('/api/admin/orders/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); }
    else {
      setOrders((prev) => prev.map((o) =>
        o.id === orderId ? { ...o, estado: 'pagado', stock_descontado: true } : o
      ));
      toast.success('Pedido marcado como pagado y stock descontado');
    }
    setLoading(null);
  };

  // ── Quick filter tabs ────────────────────────────────────────
  const filterTabs = [
    { id: 'todos',         label: 'Todos',          count: orders.length },
    { id: 'pendiente',     label: 'Pendientes',      count: orders.filter(o => o.estado === 'pendiente').length },
    { id: 'comprobante',   label: '📎 Comprobantes', count: pendingComprobanteCount, special: true },
    { id: 'pagado',        label: 'Pagados',         count: orders.filter(o => o.estado === 'pagado').length },
    { id: 'enviado',       label: 'Enviados',        count: orders.filter(o => o.estado === 'enviado').length },
  ];

  // Special filter: comprobantes to review
  const effectiveFilter = filter === 'comprobante'
    ? orders.filter(o => o.metodo_pago === 'transferencia' && o.comprobante_url && !o.comprobante_revisado)
    : filtered;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o ID…"
            className="input-base pl-9 py-2 text-sm" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="input-base w-auto py-2 text-sm">
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{ORDER_STATUS_LABELS[e]}</option>)}
        </select>
      </div>

      {/* Quick filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map(({ id, label, count, special }) => (
          <button key={id} onClick={() => setFilter(id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
              filter === id
                ? special
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-brand-500 border-brand-500 text-white'
                : 'border-border text-muted hover:border-brand-400',
              special && count > 0 && filter !== id && 'border-green-400 text-green-600 bg-green-50 dark:bg-green-950/20'
            )}>
            {label} {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
          </button>
        ))}
      </div>

      {/* Real-time indicator (cambiado a polling) */}
      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        Actualización cada 10 segundos (polling)
      </div>

      <p className="text-xs text-muted">{effectiveFilter.length} pedido{effectiveFilter.length !== 1 ? 's' : ''}</p>

      {/* Orders list */}
      <div className="space-y-3">
        {effectiveFilter.map((order) => {
          // ✅ CONDICIÓN MEJORADA: muestra botones para comprobantes sin revisar
          const hasComprobanteToReview =
            order.metodo_pago === 'transferencia' &&
            order.comprobante_url &&
            !order.comprobante_revisado &&
            (order.estado === 'pendiente' || order.estado === 'pendiente_pago');

          return (
            <div key={order.id} className={cn(
              'card overflow-hidden',
              hasComprobanteToReview && 'ring-2 ring-green-400 dark:ring-green-600'
            )}>
              {/* Header */}
              <div
                className="flex flex-wrap items-center gap-3 p-4 cursor-pointer hover:bg-surface-2 transition-colors"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <ChevronDown size={16} className={cn('text-muted transition-transform', expanded === order.id && 'rotate-180')} />
                <span className="font-mono text-xs text-muted">#{order.id.slice(0,8).toUpperCase()}</span>
                <span className="font-medium text-sm flex-1 min-w-0 truncate">{order.nombre}</span>

                {/* Comprobante badge */}
                {hasComprobanteToReview && (
                  <span className="badge bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 gap-1">
                    <FileCheck size={11} /> Comprobante pendiente
                  </span>
                )}

                <span className="text-xs text-muted hidden sm:block">{formatDate(order.created_at)}</span>
                <span className={`badge ${ORDER_STATUS_COLORS[order.estado]}`}>{ORDER_STATUS_LABELS[order.estado]}</span>
                <span className="font-bold text-brand-600 text-sm">{formatPrice(order.total)}</span>
              </div>

              {/* Expanded */}
              {expanded === order.id && (
                <div className="border-t border-border p-4 space-y-4 animate-fade-in">
                  {/* Info grid */}
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-xs text-muted mb-1">Contacto</p>
                      <p>{order.email}</p>
                      {order.telefono && <p className="text-muted">{order.telefono}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Dirección</p>
                      <p>{order.direccion}, {order.ciudad} ({order.codigo_postal})</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Método de pago</p>
                      <p className="capitalize">{order.metodo_pago}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Tipo de entrega</p>
                      <p className="flex items-center gap-1.5">
                        {(order as Order & { tipo_entrega?: string }).tipo_entrega === 'retiro'
                          ? <span className="badge bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">🏪 Retiro en local</span>
                          : <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">🚚 Envío a domicilio</span>}
                      </p>
                    </div>

                    {/* 👇 CÓDIGO DE RETIRO (solo si pago confirmado) */}
                    {(order as Order & { tipo_entrega?: string }).tipo_entrega === 'retiro' && (
                      <div className="sm:col-span-2 mt-1">
                        <p className="text-xs text-muted mb-1">Código de retiro</p>
                        {['pagado', 'procesando', 'enviado', 'entregado'].includes(order.estado) ? (
                          (order as Order & { codigo_retiro?: string }).codigo_retiro ? (
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-dashed border-yellow-400 dark:border-yellow-600 rounded-lg p-2 text-center">
                              <p className="text-xl font-mono font-bold text-yellow-700 dark:text-yellow-400 tracking-widest">
                                {(order as Order & { codigo_retiro?: string }).codigo_retiro}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                El cliente debe presentar este código al retirar.
                              </p>
                            </div>
                          ) : (
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 text-center">
                              <p className="text-xs text-yellow-700 dark:text-yellow-400">⚠️ Sin código asignado</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Este pedido no tiene código de retiro. Asignar manualmente si es necesario.
                              </p>
                            </div>
                          )
                        ) : (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-center">
                            <p className="text-xs text-blue-700 dark:text-blue-400">🔒 Código disponible tras confirmar pago</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted mb-1">Stock</p>
                      <p>{order.stock_descontado ? '✅ Descontado' : '⏳ Pendiente'}</p>
                    </div>
                    {(order as Order & { rejection_reason?: string }).rejection_reason && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted mb-1">Motivo de rechazo</p>
                        <p className="text-red-600 dark:text-red-400">{(order as Order & { rejection_reason?: string }).rejection_reason}</p>
                      </div>
                    )}
                    {order.notas && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted mb-1">Notas del cliente</p>
                        <p className="text-muted italic">{order.notas}</p>
                      </div>
                    )}
                  </div>

                  {/* Items - ✅ CORREGIDO para curvas */}
                  <div>
                    <p className="text-xs text-muted mb-2">Productos</p>
                    {(order.order_items ?? []).map((item: any) => {
                      // ✅ Usamos cantidad_items o fallback a cantidad_packs
                      const cantidad = item.cantidad_items ?? item.cantidad_packs ?? 0;
                      const descripcion = getItemDescription(item);
                      return (
                        <div key={item.id} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                          <span className="text-muted">
                            {item.nombre_snap} · {descripcion} ×{cantidad} ({item.unidades} uds)
                          </span>
                          <span>{formatPrice(item.subtotal)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between font-bold mt-2">
                      <span>Total</span>
                      <span className="text-brand-600">{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  {/* Comprobante */}
                  {order.comprobante_url && (
                    <a href={order.comprobante_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
                      <ExternalLink size={14} /> Ver comprobante de transferencia
                    </a>
                  )}

                  {/* ── ACCIONES ──────────────────────────────── */}
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-border">

                    {/* Estado selector */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted">Estado:</label>
                      <select
                        value={order.estado}
                        onChange={(e) => updateStatus(order.id, e.target.value as OrderEstado)}
                        disabled={!!loading}
                        className="input-base py-1.5 text-xs w-auto"
                      >
                        {ESTADOS.map((e) => <option key={e} value={e}>{ORDER_STATUS_LABELS[e]}</option>)}
                      </select>
                    </div>

                    {/* ✅ APROBAR COMPROBANTE */}
                    {hasComprobanteToReview && (
                      <button
                        onClick={() => approveTransfer(order.id)}
                        disabled={!!loading}
                        className="flex items-center gap-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
                      >
                        {loading === order.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <CheckCircle size={13} />}
                        Aprobar comprobante
                      </button>
                    )}

                    {/* ❌ RECHAZAR COMPROBANTE */}
                    {hasComprobanteToReview && (
                      <button
                        onClick={() => { setRejectModal({ orderId: order.id }); setRejectMotivo(''); }}
                        disabled={!!loading}
                        className="flex items-center gap-1.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
                      >
                        <XCircle size={13} /> Rechazar comprobante
                      </button>
                    )}

                    {/* Mark paid (MP orders without webhook) */}
                    {order.metodo_pago === 'mercadopago' && !order.stock_descontado && order.estado !== 'cancelado' && (
                      <button
                        onClick={() => markPaidWithStock(order.id)}
                        disabled={!!loading}
                        className="btn-primary py-1.5 text-xs gap-1.5"
                      >
                        {loading === order.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <CheckCircle size={13} />}
                        Confirmar pago manual
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {effectiveFilter.length === 0 && (
          <div className="card p-12 text-center text-muted">
            <Clock size={32} className="mx-auto mb-3 opacity-20" />
            <p>No hay pedidos que coincidan con los filtros.</p>
          </div>
        )}
      </div>

      {/* ── Reject Modal ───────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-2xl p-6 animate-scale-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 dark:bg-red-950/30 p-2">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold">Rechazar comprobante</h3>
                <p className="text-xs text-muted">El cliente será notificado por email.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Motivo del rechazo *</label>
              <textarea
                value={rejectMotivo}
                onChange={(e) => setRejectMotivo(e.target.value)}
                placeholder="Ej: Comprobante ilegible, monto incorrecto, etc."
                rows={3}
                className="input-base w-full resize-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setRejectModal(null); setRejectMotivo(''); }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={rejectTransfer}
                disabled={!rejectMotivo.trim() || loading === rejectModal.orderId}
                className="btn-danger flex-1"
              >
                {loading === rejectModal.orderId
                  ? <Loader2 size={16} className="animate-spin mx-auto" />
                  : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}