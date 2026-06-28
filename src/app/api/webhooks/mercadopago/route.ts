// src/app/api/webhooks/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendCashPaymentPendingEmail,
} from '@/lib/email';
import type { Order, OrderEstado } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

interface MPWebhookBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

interface MPPaymentResponse {
  id: number;
  status: 'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  status_detail: string;
  external_reference: string | null;
  date_approved: string | null;
  transaction_amount: number;
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  // 📡 LOG DISTINTIVO PARA SABER SI ESTE ENDPOINT SE EJECUTA
  console.log('📡📡📡 WEBHOOK EJECUTADO 📡📡📡');

  try {
    const body = (await req.json().catch(() => null)) as MPWebhookBody | null;

    if (!body || body.type !== 'payment') {
      return ackOk();
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.warn('[MP Webhook] Evento "payment" sin data.id', body);
      return ackOk();
    }

    const payment = await fetchPaymentFromMP(String(paymentId));
    if (!payment) {
      console.error(`[MP Webhook] No se pudo obtener el pago ${paymentId} desde la API de MP`);
      return ackOk();
    }

    const orderId = payment.external_reference;
    if (!orderId) {
      console.warn(`[MP Webhook] Pago ${paymentId} sin external_reference`);
      return ackOk();
    }

    const admin = createAdminClient();
    await processPaymentStatus(admin, orderId, payment);

    return ackOk();
  } catch (err: unknown) {
    console.error('[MP Webhook] Error no controlado:', err);
    return ackOk();
  }
}

// ============================================================
// HELPERS
// ============================================================

function ackOk() {
  return NextResponse.json({ received: true }, { status: 200 });
}

async function fetchPaymentFromMP(paymentId: string): Promise<MPPaymentResponse | null> {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[MP Webhook] GET /v1/payments/${paymentId} → ${res.status}`);
      return null;
    }

    return (await res.json()) as MPPaymentResponse;
  } catch (err) {
    console.error(`[MP Webhook] Error consultando pago ${paymentId}:`, err);
    return null;
  }
}

async function processPaymentStatus(
  admin: SupabaseClient,
  orderId: string,
  payment: MPPaymentResponse
): Promise<void> {
  const { status, status_detail, id: mpPaymentId, date_approved } = payment;

  const { data: order, error: fetchErr } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    console.error(`[MP Webhook] Pedido ${orderId} no encontrado`, fetchErr);
    return;
  }

  const currentOrder = order as Order;

  switch (status) {
    case 'pending':
    case 'in_process': {
      const alreadyNotified =
        currentOrder.estado === 'pendiente_pago' &&
        currentOrder.mp_payment_id === String(mpPaymentId);

      await admin
        .from('orders')
        .update({
          estado:           'pendiente_pago' as OrderEstado,
          mp_payment_id:     String(mpPaymentId),
          mp_status_detail:  status_detail,
          updated_at:        new Date().toISOString(),
        })
        .eq('id', orderId);

      if (!alreadyNotified) {
        const { data: refreshed } = await admin
          .from('orders').select('*, order_items(*)').eq('id', orderId).single();

        if (refreshed) {
          await sendCashPaymentPendingEmail(refreshed as Order).catch((err) =>
            console.error('[MP Webhook] Error enviando email de cupón pendiente:', err)
          );
        }
      }

      console.log(`[MP Webhook] Pedido ${orderId} → pendiente_pago (${status_detail})`);
      break;
    }

    case 'approved': {
      if (currentOrder.stock_descontado && currentOrder.estado === 'pagado') {
        console.log(`[MP Webhook] Pedido ${orderId} ya estaba pagado — ignorando duplicado`);
        await admin
          .from('orders')
          .update({ mp_payment_id: String(mpPaymentId), mp_status_detail: status_detail })
          .eq('id', orderId);
        break;
      }

      const { data: result } = await admin.rpc('descontar_stock_seguro', {
        p_order_id: orderId,
      });

      if (!result?.success) {
        console.error(`[MP Webhook] Fallo al descontar stock para ${orderId}:`, result);

        await admin
          .from('orders')
          .update({
            mp_payment_id:    String(mpPaymentId),
            mp_status_detail: status_detail,
            notas: `${currentOrder.notas ?? ''}\n⚠️ Pago aprobado pero sin stock suficiente. Revisar manualmente.`.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        break;
      }

      await admin
        .from('orders')
        .update({
          mp_payment_id:    String(mpPaymentId),
          mp_status_detail: status_detail,
          fecha_pago:       date_approved ?? new Date().toISOString(),
          updated_at:       new Date().toISOString(),
        })
        .eq('id', orderId);

      const { data: paidOrder } = await admin
        .from('orders').select('*, order_items(*)').eq('id', orderId).single();

      if (paidOrder) {
        await sendOrderConfirmationEmail(paidOrder as Order).catch((err) =>
          console.error('[MP Webhook] Error enviando email de confirmación:', err)
        );
      }

      console.log(`[MP Webhook] Pedido ${orderId} → pagado ✅ (stock descontado)`);
      break;
    }

    case 'rejected':
    case 'cancelled': {
      if (currentOrder.estado === 'cancelado') {
        console.log(`[MP Webhook] Pedido ${orderId} ya estaba cancelado — ignorando duplicado`);
        break;
      }

      if (currentOrder.stock_descontado) {
        const { data: restoreResult } = await admin.rpc('devolver_stock_seguro', {
          p_order_id: orderId,
        });

        if (!restoreResult?.success) {
          console.error(`[MP Webhook] Error devolviendo stock para ${orderId}:`, restoreResult);
        } else {
          console.log(`[MP Webhook] Stock restaurado para pedido ${orderId}`);
        }
      }

      await admin
        .from('orders')
        .update({
          estado:           'cancelado' as OrderEstado,
          mp_payment_id:     String(mpPaymentId),
          mp_status_detail:  status_detail,
          updated_at:        new Date().toISOString(),
        })
        .eq('id', orderId);

      const { data: cancelledOrder } = await admin
        .from('orders').select('*, order_items(*)').eq('id', orderId).single();

      if (cancelledOrder) {
        await sendOrderStatusEmail(cancelledOrder as Order).catch((err) =>
          console.error('[MP Webhook] Error enviando email de cancelación:', err)
        );
      }

      console.log(`[MP Webhook] Pedido ${orderId} → cancelado (${status_detail})`);
      break;
    }

    case 'refunded':
    case 'charged_back': {
      // 1. Restaurar stock si estaba descontado
      if (currentOrder.stock_descontado) {
        const { data: restoreResult } = await admin.rpc('devolver_stock_seguro', {
          p_order_id: orderId,
        });

        if (!restoreResult?.success) {
          console.error(`[MP Webhook] Error devolviendo stock para ${orderId}:`, restoreResult);
        } else {
          console.log(`[MP Webhook] Stock restaurado para pedido ${orderId}`);
        }
      }

      // 2. Determinar motivo
      const motivo = status === 'refunded' ? 'Reembolso total' : 'Contracargo';

      // 3. Actualizar orden a "reembolsado"
      await admin
        .from('orders')
        .update({
          estado:           'reembolsado' as OrderEstado,
          mp_status_detail: status_detail,
          rejection_reason: `${motivo} (MP status: ${status_detail})`,
          updated_at:       new Date().toISOString(),
        })
        .eq('id', orderId);

      // 4. Enviar email al cliente
      const { data: updatedOrder } = await admin
        .from('orders').select('*, order_items(*)').eq('id', orderId).single();

      if (updatedOrder) {
        await sendOrderStatusEmail(updatedOrder as Order).catch((err) =>
          console.error('[MP Webhook] Error enviando email de reembolso:', err)
        );
      }

      console.log(`[MP Webhook] Pedido ${orderId} → reembolsado (${status})`);
      break;
    }

    default: {
      console.warn(`[MP Webhook] Estado no manejado para pedido ${orderId}: ${status}`);
      await admin
        .from('orders')
        .update({ mp_status_detail: status_detail, updated_at: new Date().toISOString() })
        .eq('id', orderId);
    }
  }
}

export const runtime = 'nodejs';