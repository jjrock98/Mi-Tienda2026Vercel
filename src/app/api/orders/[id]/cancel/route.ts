import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendOrderCancelledEmail,
  sendAdminOrderCancelledEmail,
} from '@/lib/email';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const admin = createAdminClient();

  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, estado, stock_descontado, email, nombre, total, rejection_reason')
    .eq('id', params.id)
    .single();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  // Permitir cancelar si está pendiente o pagado
  if (order.estado !== 'pendiente' && order.estado !== 'pagado') {
    return NextResponse.json({
      error: `No se puede cancelar un pedido en estado "${order.estado}".`,
    }, { status: 409 });
  }

  // Si ya se descontó, restituir stock
  if (order.stock_descontado) {
    const { data: restoreResult, error: restoreError } = await admin.rpc('devolver_stock_seguro', {
      p_order_id: params.id,
    });
    if (restoreError || (restoreResult && restoreResult.success === false)) {
      const errorMsg = restoreResult?.error || restoreError?.message || 'No se pudo restaurar el stock.';
      return NextResponse.json({ error: errorMsg }, { status: 409 });
    }
  }

  const { error } = await admin
    .from('orders')
    .update({
      estado: 'cancelado',
      rejection_reason: order.stock_descontado ? 'Cancelado por el usuario (stock restituido)' : 'Cancelado por el usuario',
      updated_at: new Date().toISOString(),
      stock_descontado: false,
    })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enviar correos
  try {
    const fullOrder = await admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', params.id)
      .single()
      .then(({ data }) => data);
    if (fullOrder) {
      await sendOrderCancelledEmail(fullOrder);
      await sendAdminOrderCancelledEmail(fullOrder);
    }
  } catch (err) {
    console.error('Error enviando correo de cancelación:', err);
  }

  return NextResponse.json({ ok: true });
}