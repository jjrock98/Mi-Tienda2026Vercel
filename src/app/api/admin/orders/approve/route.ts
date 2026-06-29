import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendPaymentConfirmedEmail,
  sendAdminPaymentConfirmedEmail,
  sendOrderConfirmationEmail, // 👈 NUEVA IMPORTACIÓN
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

  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });

  const admin = createAdminClient();

  const { data: currentOrder } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (!currentOrder) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  if (currentOrder.estado === 'pagado') {
    return NextResponse.json({ error: 'El pedido ya está pagado' }, { status: 409 });
  }

  if (currentOrder.estado !== 'pendiente_pago') {
    return NextResponse.json(
      { error: `El pedido está en estado "${currentOrder.estado}" y no se puede aprobar.` },
      { status: 409 }
    );
  }

  // ✅ El stock ya fue descontado al subir comprobante, solo actualizamos el estado
  const { data: order, error } = await admin
    .from('orders')
    .update({
      estado: 'pagado',
      updated_at: new Date().toISOString(),
      comprobante_revisado: true,
    })
    .eq('id', orderId)
    .select('*, order_items(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 📧 Enviar correos (AHORA CON EL CORREO COMPLETO)
  if (order) {
    try {
      // ✅ Correo completo (con código de retiro, detalle de productos, etc.)
      await sendOrderConfirmationEmail(order);
      // Correo genérico de "Pago confirmado" (opcional, pero lo dejamos)
      await sendPaymentConfirmedEmail(order);
      // Notificación al admin
      await sendAdminPaymentConfirmedEmail(order);
    } catch (err) {
      console.error('Error enviando correos de aprobación:', err);
    }
  }

  return NextResponse.json({ ok: true, data: order });
}