import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderStatusEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // ✅ Read orderId from body (not from URL params)
  const body = await req.json().catch(() => ({}));
  const orderId = body.id ?? body.orderId;
  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });

  const admin = createAdminClient();

  const { data: order } = await admin
    .from('orders')
    .select('id, metodo_pago, comprobante_url, estado, stock_descontado')
    .eq('id', orderId)
    .single();

  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  if (order.metodo_pago !== 'transferencia') {
    return NextResponse.json({ error: 'Solo se pueden aprobar pagos por transferencia' }, { status: 400 });
  }
  if (!order.comprobante_url) {
    return NextResponse.json({ error: 'El cliente aún no subió el comprobante' }, { status: 400 });
  }
  if (order.stock_descontado) {
    return NextResponse.json({ error: 'El stock ya fue descontado para este pedido' }, { status: 409 });
  }

  // Atomic stock deduction via DB function
  const { data: result } = await admin.rpc('descontar_stock_seguro', { p_order_id: orderId });

  if (!result?.success) {
    return NextResponse.json({
      error: result?.error || (result?.errors as string[] | undefined)?.join(', ') || 'Error al descontar stock',
    }, { status: 409 });
  }

  // Mark comprobante as reviewed
  await admin.from('orders').update({
    comprobante_revisado: true,
    updated_at: new Date().toISOString(),
  }).eq('id', orderId);

  // Send email to customer
  const { data: fullOrder } = await admin
    .from('orders').select('*, order_items(*)').eq('id', orderId).single();
  if (fullOrder) sendOrderStatusEmail(fullOrder).catch(console.error);

  return NextResponse.json({ ok: true, message: 'Pago aprobado y stock descontado' });
}
