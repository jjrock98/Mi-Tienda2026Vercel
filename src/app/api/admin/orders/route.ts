import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendOrderStatusEmail,
  sendOrderProcessingEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendAdminOrderStatusEmail,
} from '@/lib/email';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single();
  return profile?.rol === 'admin' ? user : null;
}

export async function PATCH(req: NextRequest) {
  const adminUser = await verifyAdmin();
  if (!adminUser) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { orderId, estado, tracking_number } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
  if (!estado) return NextResponse.json({ error: 'estado requerido' }, { status: 400 });

  const admin = createAdminClient();

  // Obtener el pedido actual para conocer el estado anterior
  const { data: currentOrder } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (!currentOrder) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  const oldStatus = currentOrder.estado;

  // Actualizar el estado
  const { data: order, error } = await admin
    .from('orders')
    .update({
      estado,
      updated_at: new Date().toISOString(),
      ...(tracking_number ? { tracking_number } : {}),
    })
    .eq('id', orderId)
    .select('*, order_items(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Enviar correos según el nuevo estado ──
  if (order && oldStatus !== estado) {
    try {
      // Notificar al cliente según el estado
      switch (estado) {
        case 'procesando':
          await sendOrderProcessingEmail(order);
          break;
        case 'enviado':
          await sendOrderShippedEmail(order, tracking_number || undefined);
          break;
        case 'entregado':
          await sendOrderDeliveredEmail(order);
          break;
        case 'cancelado':
          await sendOrderCancelledEmail(order);
          break;
        case 'pagado':
          // Ya se envía desde el webhook de MP, pero lo dejamos por si acaso
          break;
        default:
          // Para cualquier otro estado (incluyendo cambios manuales)
          await sendOrderStatusEmail(order);
          break;
      }

      // Notificar al administrador del cambio de estado (para todos los casos)
      await sendAdminOrderStatusEmail(order, oldStatus, estado);

    } catch (err) {
      console.error('Error enviando correos de notificación:', err);
    }
  }

  return NextResponse.json({ ok: true, data: order });
}
