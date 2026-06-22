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

  // Verificar que el pedido pertenece al usuario
  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('id, user_id, estado, stock_descontado, email, nombre, total, rejection_reason')
    .eq('id', params.id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Solo se pueden cancelar pedidos pendientes sin stock descontado
  if (order.estado !== 'pendiente') {
    return NextResponse.json({
      error: `No se puede cancelar un pedido en estado "${order.estado}". Solo se pueden cancelar pedidos pendientes.`,
    }, { status: 409 });
  }

  if (order.stock_descontado) {
    return NextResponse.json({
      error: 'El pago ya fue procesado. Contactanos para gestionar la devolución.',
    }, { status: 409 });
  }

  const { error } = await admin
    .from('orders')
    .update({ 
      estado: 'cancelado', 
      rejection_reason: 'Cancelado por el usuario', 
      updated_at: new Date().toISOString() 
    })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Enviar correos de cancelación (no bloqueante) ──
  try {
    const fullOrder = await admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', params.id)
      .single()
      .then(({ data }) => data as any);

    if (fullOrder) {
      // Enviar al cliente
      sendOrderCancelledEmail(fullOrder).catch(console.error);
      // Enviar al administrador
      sendAdminOrderCancelledEmail(fullOrder).catch(console.error);
    }
  } catch (err) {
    console.error('Error enviando correo de cancelación:', err);
  }

  return NextResponse.json({ ok: true });
}
