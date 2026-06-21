import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const admin = createAdminClient();

  // Verificar que el pedido pertenece al usuario
  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, estado, stock_descontado')
    .eq('id', params.id)
    .single();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
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
    .update({ estado: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
