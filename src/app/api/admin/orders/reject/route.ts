import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendOrderCancelledEmail,
  sendAdminOrderCancelledEmail,
} from '@/lib/email';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single();
  return profile?.rol === 'admin' ? user : null;
}

export async function POST(req: NextRequest) {
  const adminUser = await verifyAdmin();
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = await req.json();
  const orderId = body.orderId ?? body.id;
  const reason = body.reason ?? body.motivo ?? 'Rechazado por el administrador';

  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
  if (!reason) return NextResponse.json({ error: 'El motivo de rechazo es obligatorio' }, { status: 400 });

  const admin = createAdminClient();

  const { data: currentOrder } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (!currentOrder) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  if (currentOrder.estado === 'cancelado') {
    return NextResponse.json({ error: 'El pedido ya está cancelado' }, { status: 409 });
  }

  // 🔄 Si el stock ya fue descontado, restituirlo antes de cancelar
  if (currentOrder.stock_descontado) {
    const { data: restoreResult, error: restoreError } = await admin.rpc('devolver_stock_seguro', {
      p_order_id: orderId,
    });
    if (restoreError || (restoreResult && restoreResult.success === false)) {
      const errorMsg = restoreResult?.error || restoreError?.message || 'No se pudo restaurar el stock.';
      return NextResponse.json({ error: errorMsg }, { status: 409 });
    }
    console.log(`✅ Stock restituido para pedido ${orderId} (rechazo)`);
  }

  // Actualizar a cancelado con motivo
  const { data: order, error } = await admin
    .from('orders')
    .update({
      estado: 'cancelado',
      rejection_reason: reason,
      stock_descontado: false, // porque ya se restituyó
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*, order_items(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enviar correos de cancelación
  if (order) {
    try {
      await sendOrderCancelledEmail(order);
      await sendAdminOrderCancelledEmail(order);
    } catch (err) {
      console.error('Error enviando correos de rechazo:', err);
    }
  }

  return NextResponse.json({ ok: true, data: order });
}