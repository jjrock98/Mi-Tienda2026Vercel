import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadComprobanteSchema, parseBody } from '@/lib/validations';
import { rateLimiters } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = rateLimiters.upload(req);
  if (limited) return limited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const rawBody = await req.json().catch(() => null);
    const { data, error: validErr } = parseBody(uploadComprobanteSchema, rawBody);
    if (validErr) return NextResponse.json({ error: validErr }, { status: 422 });

    if (!data) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 });

    const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comprobantes/`;
    if (!data.comprobanteUrl.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'URL de comprobante inválida' }, { status: 422 });
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from('orders')
      .select('id, user_id, estado, stock_descontado')
      .eq('id', data.orderId)
      .single();

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Si el pedido ya está pagado o cancelado, no permitir subir comprobante
    if (order.estado === 'pagado' || order.estado === 'cancelado') {
      return NextResponse.json({ error: `El pedido ya está ${order.estado}` }, { status: 409 });
    }

    // 1. Actualizar comprobante y cambiar estado a 'pendiente_pago'
    const { error: updateErr } = await admin
      .from('orders')
      .update({
        comprobante_url: data.comprobanteUrl,
        estado: 'pendiente_pago',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.orderId);

    if (updateErr) throw updateErr;

    // 2. Descontar stock definitivamente (reserva permanente)
    const { data: stockResult, error: stockError } = await admin.rpc('descontar_stock_solo', {
      p_order_id: data.orderId,
    });

    if (stockError || (stockResult && stockResult.success === false)) {
      const errorMsg = stockResult?.error || stockResult?.errors?.[0] || stockError?.message || 'No se pudo descontar el stock.';
      console.error('❌ Error al descontar stock en upload:', errorMsg);
      // No devolvemos error al cliente, pero loggeamos para que el admin sepa
    } else {
      console.log(`✅ Stock descontado para pedido ${data.orderId}`);
    }

    // 3. Liberar reservas temporales de carrito (si existen)
    const sessionId = req.headers.get('x-session-id') || 'unknown';
    await admin.rpc('liberar_reserva_carrito', {
      p_session_id: sessionId,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Error al guardar comprobante' }, { status: 500 });
  }
}