import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // ✅ Read from body
  const body = await req.json().catch(() => ({}));
  const orderId = body.id ?? body.orderId;
  const motivo  = body.motivo?.trim();

  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
  if (!motivo)  return NextResponse.json({ error: 'El motivo de rechazo es obligatorio' }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders').select('*').eq('id', orderId).single();

  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  if (order.metodo_pago !== 'transferencia') {
    return NextResponse.json({ error: 'Solo aplica para pagos por transferencia' }, { status: 400 });
  }

  const { error } = await admin.from('orders').update({
    estado:               'cancelado',
    rejection_reason:      motivo,
    comprobante_revisado:  true,
    updated_at:           new Date().toISOString(),
  }).eq('id', orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email al cliente
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from:    `${process.env.RESEND_FROM_NAME ?? 'Mi Tienda'} <${process.env.RESEND_FROM_EMAIL}>`,
    to:      order.email,
    subject: `Comprobante rechazado — Pedido #${order.id.slice(0,8).toUpperCase()}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#dc2626">Comprobante rechazado</h2>
      <p>Hola <strong>${order.nombre}</strong>,</p>
      <p>No pudimos aprobar el comprobante de tu pedido <strong>#${order.id.slice(0,8).toUpperCase()}</strong>.</p>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px">
        <strong>Motivo:</strong> ${motivo}
      </div>
      <p>Contactanos si tenés dudas o para reenviar el comprobante correcto.</p>
    </div>`,
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}
