import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, getCashCouponExpiry } from '@/utils';
import { PACK_CONFIG } from '@/types';
import type { Order, TipoPack } from '@/types';
import { ArrowLeft, Package, ExternalLink, MapPin, Store, Navigation, Receipt, CalendarClock } from 'lucide-react';
import { OrderCancelButton } from '@/components/orders/OrderCancelButton';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
interface Props { params: { id: string } }
export async function generateMetadata({ params }: Props) {
  return { title: `Pedido #${params.id.slice(0,8).toUpperCase()}` };
}

const ALL_STEPS    = ['pendiente','pagado','procesando','enviado','entregado'];
const RETIRO_STEPS = ['pendiente','pagado','procesando','entregado'];

function normalizeStepEstado(estado: string): string {
  return estado === 'pendiente_pago' ? 'pendiente' : estado;
}

// ✅ Helper seguro para obtener la descripción de un item de pedido
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

export default async function OrderDetailPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/mis-pedidos');

  // 🔍 Incluimos codigo_retiro y los nuevos campos de order_items
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      codigo_retiro,
      rejection_reason,
      order_items(
        id,
        tipo_venta,
        tipo_pack,
        unidades_por_item,
        cantidad_items,
        unidades,
        precio_unit,
        subtotal,
        nombre_snap,
        imagen_snap
      )
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!order) notFound();
  const o = order as Order;

  const isRetiro    = o.tipo_entrega === 'retiro';
  const isCancelled = o.estado === 'cancelado';
  const canCancel   = o.estado === 'pendiente' && !o.stock_descontado;
  const steps       = isRetiro ? RETIRO_STEPS : ALL_STEPS;
  const currentStep = isCancelled ? -1 : steps.indexOf(normalizeStepEstado(o.estado));

  const pagoConfirmado = ['pagado', 'procesando', 'enviado', 'entregado'].includes(o.estado);

  const admin = createAdminClient();
  const [{ data: contactInfo }] = await Promise.all([
    admin.from('contact_info').select('direccion,telefono,horario').single(),
  ]);
  const mapsUrl = contactInfo?.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.direccion)}`
    : 'https://maps.google.com';

  const codigoValido = o.codigo_retiro && 
    typeof o.codigo_retiro === 'string' && 
    o.codigo_retiro.trim().length > 0 &&
    !o.codigo_retiro.includes('undefined');

  // 🎯 Función para determinar el estado de pago y su color
  function getPaymentStatus(order: Order): { text: string; color: string } {
    const { metodo_pago, estado, comprobante_url, comprobante_revisado, stock_descontado, rejection_reason } = order;

    // === TRANSFERENCIA BANCARIA ===
    if (metodo_pago === 'transferencia') {
      if (estado === 'cancelado' && rejection_reason && comprobante_url) {
        return { text: `❌ Pago rechazado: ${rejection_reason}`, color: 'text-red-600' };
      }
      if (comprobante_revisado && ['pagado', 'procesando', 'enviado', 'entregado'].includes(estado)) {
        return { text: '✅ Pago confirmado', color: 'text-green-600' };
      }
      if (comprobante_url && !comprobante_revisado) {
        return { text: '⏳ Comprobante en revisión', color: 'text-blue-600' };
      }
      return { text: '⏳ Pendiente de pago', color: 'text-amber-600' };
    }

    // === MERCADO PAGO ===
    if (metodo_pago === 'mercadopago') {
      if (estado === 'cancelado') {
        return { text: '❌ Pago rechazado', color: 'text-red-600' };
      }
      if (estado === 'pagado' && stock_descontado) {
        return { text: '✅ Pago confirmado', color: 'text-green-600' };
      }
      if (estado === 'pendiente_pago') {
        return { text: '⏳ Procesando pago...', color: 'text-blue-600' };
      }
      if (estado === 'pendiente' || (estado === 'pagado' && !stock_descontado)) {
        return { text: '⏳ Pendiente de confirmación', color: 'text-amber-600' };
      }
      return { text: '⏳ Pendiente de pago', color: 'text-amber-600' };
    }

    return { text: '⏳ Pendiente de pago', color: 'text-amber-600' };
  }

  const paymentStatus = getPaymentStatus(o);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/mis-pedidos" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6">
        <ArrowLeft size={15} /> Mis pedidos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Pedido <span className="font-mono">#{o.id.slice(0,8).toUpperCase()}</span></h1>
          <p className="text-sm text-muted mt-1">{formatDate(o.created_at)}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isRetiro && (
            <span className="badge bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 gap-1.5">
              <Store size={11} /> Retiro en local
            </span>
          )}
          <span className={`badge text-sm px-3 py-1.5 ${ORDER_STATUS_COLORS[o.estado]}`}>
            {ORDER_STATUS_LABELS[o.estado]}
          </span>
        </div>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="card p-5 mb-5 overflow-x-auto">
          <div className="flex items-start min-w-max">
            {steps.map((step, i) => (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className={`flex flex-col items-center gap-1.5 ${i <= currentStep ? 'text-brand-600' : 'text-muted'}`}>
                  <div className={`h-3 w-3 rounded-full border-2 transition-all ${
                    i < currentStep  ? 'bg-brand-500 border-brand-500' :
                    i === currentStep ? 'bg-white border-brand-500 ring-2 ring-brand-200 dark:ring-brand-800' :
                    'bg-surface-2 border-border'}`} />
                  <span className="text-[10px] font-medium text-center w-14 leading-tight">
                    {ORDER_STATUS_LABELS[step]}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentStep ? 'bg-brand-500' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 mb-5 text-sm text-red-600 dark:text-red-400">
          <p className="font-medium">Pedido cancelado.</p>
          {o.rejection_reason && <p className="mt-1">Motivo: {o.rejection_reason}</p>}
        </div>
      )}

      {/* Cupón de efectivo (SOLO para Mercado Pago) */}
      {o.estado === 'pendiente_pago' && o.metodo_pago === 'mercadopago' && (
        <div className="card border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/10 p-5 mb-5">
          <h2 className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-3">
            <Receipt size={18} /> Cupón de pago en efectivo generado
          </h2>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            Tu pedido está reservado. Pagá el cupón que te enviamos por email
            en Rapipago, Pago Fácil u otro punto habilitado.
          </p>
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/30 rounded-lg p-3">
            <CalendarClock size={15} className="mt-0.5 shrink-0" />
            <span>
              Vence el <strong>{getCashCouponExpiry(o.created_at)}</strong>. Si no pagás antes,
              el pedido se cancela automáticamente y el stock se libera.
            </span>
          </div>
        </div>
      )}

      {/* Comprobante en revisión (para transferencia) */}
      {o.estado === 'pendiente_pago' && o.metodo_pago === 'transferencia' && (
        <div className="card border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/10 p-5 mb-5">
          <h2 className="font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-3">
            <Receipt size={18} /> Comprobante en revisión
          </h2>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Tu comprobante de transferencia fue recibido. Estamos verificando el pago y te avisaremos por email cuando sea aprobado.
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            El stock de los productos ha sido reservado temporalmente mientras se confirma tu pago.
          </p>
        </div>
      )}

      {/* RETIRO EN LOCAL */}
      {isRetiro && !isCancelled && (
        <div className="card border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/10 p-5 mb-5">
          <h2 className="font-semibold text-green-800 dark:text-green-400 flex items-center gap-2 mb-4">
            <Store size={18} /> Información de retiro en local
          </h2>
          <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
            {contactInfo?.direccion && (
              <div className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0" />
                <span className="font-medium">{contactInfo.direccion}</span>
              </div>
            )}
            {contactInfo?.telefono && <p>📞 {contactInfo.telefono}</p>}
            {contactInfo?.horario
              ? <p>🕐 {contactInfo.horario}</p>
              : <p>🕐 Lunes a viernes de 9 a 18hs</p>}

            {pagoConfirmado && codigoValido ? (
              <div className="bg-white dark:bg-zinc-800 border-2 border-dashed border-green-400 dark:border-green-600 rounded-lg p-3 my-2 text-center">
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 tracking-wider">Código de retiro</p>
                <p className="text-2xl font-mono font-bold text-green-700 dark:text-green-400 tracking-widest">
                  {o.codigo_retiro}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Presentá este código al retirar tu pedido.
                </p>
              </div>
            ) : pagoConfirmado && !codigoValido ? (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 my-2 text-center">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  ⚠️ Este pedido no tiene código de retiro asignado. Contactá al local para coordinar el retiro.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 my-2 text-center">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  🔒 El código de retiro estará disponible una vez que se confirme el pago.
                </p>
              </div>
            )}

            {(o.estado === 'pagado' || o.estado === 'procesando') && (
              <p className="mt-2 font-medium">⏳ Tu pedido se está preparando. Te avisaremos cuando esté listo.</p>
            )}
            {o.estado === 'entregado' && <p className="mt-2 font-medium">✅ ¡Pedido retirado exitosamente!</p>}
          </div>
          <div className="flex gap-3 mt-4">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary gap-2 text-sm py-2">
              <Navigation size={15} /> Cómo llegar
            </a>
            <Link href="/ubicacion" className="btn-secondary gap-2 text-sm py-2">
              <MapPin size={15} /> Ver ubicación
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-5">
        {/* Products */}
        <div className="md:col-span-3">
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Productos</h2>
            <div className="space-y-4">
              {(o.order_items ?? []).map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {item.imagen_snap
                      ? <Image src={item.imagen_snap} alt={item.nombre_snap} fill className="object-cover" sizes="56px" />
                      : <Package size={20} className="m-auto text-muted absolute inset-0" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.nombre_snap}</p>
                    <p className="text-xs text-muted">
                      {getItemDescription(item)} · {item.unidades} uds
                    </p>
                    <p className="text-xs text-muted">{formatPrice(item.precio_unit)}/item</p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">{formatPrice(item.subtotal)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatPrice(o.subtotal)}</span></div>
              <div className="flex justify-between text-muted">
                <span>Envío</span>
                <span>{isRetiro ? <span className="text-green-600 font-medium">Gratis (retiro)</span> : formatPrice(o.costo_envio)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                <span>Total</span><span className="text-brand-600">{formatPrice(o.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info + Actions */}
        <div className="md:col-span-2 space-y-4">
          <div className="card p-5 space-y-2.5 text-sm">
            <h2 className="font-semibold">{isRetiro ? 'Datos de contacto' : 'Entrega'}</h2>
            <p className="text-muted">{o.nombre}</p>
            <p className="text-muted">{o.email}</p>
            {o.telefono && <p className="text-muted">{o.telefono}</p>}
            {!isRetiro && <><p className="text-muted">{o.direccion}</p><p className="text-muted">{o.ciudad} ({o.codigo_postal})</p></>}
            {o.notas && <p className="text-muted italic text-xs border-t border-border pt-2">Nota: {o.notas}</p>}
          </div>

          {/* ✅ SECCIÓN DE PAGO CON TODOS LOS ESTADOS */}
          <div className="card p-5 space-y-2 text-sm">
            <h2 className="font-semibold">Pago</h2>
            <p className="text-muted capitalize">{o.metodo_pago}</p>
            <p className={`font-medium ${paymentStatus.color}`}>{paymentStatus.text}</p>
            {o.comprobante_url && (
              <a
                href={o.comprobante_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-brand-600 hover:underline text-xs"
              >
                <ExternalLink size={12} /> Ver comprobante
              </a>
            )}
          </div>

          <div className="space-y-2">
            {o.estado === 'pendiente' && o.metodo_pago === 'transferencia' && !o.comprobante_url && (
              <Link href={`/subir-comprobante?orderId=${o.id}`} className="btn-primary w-full text-center text-sm py-2.5">
                Subir comprobante →
              </Link>
            )}
            {canCancel && <OrderCancelButton orderId={o.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}