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

    // ✅ null check explícito para satisfacer TypeScript
    if (!data) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 });

    // ✅ Verificar que la URL pertenece a NUESTRO bucket de Supabase
    // (evita que alguien guarde un link arbitrario disfrazado de
    // "comprobante", que el admin podría abrir confiando en que es seguro)
    const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comprobantes/`;
    if (!data.comprobanteUrl.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'URL de comprobante inválida' }, { status: 422 });
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from('orders')
      .select('id, user_id')
      .eq('id', data.orderId)
      .single();

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const { error } = await admin
      .from('orders')
      .update({
        comprobante_url: data.comprobanteUrl,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', data.orderId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Error al guardar comprobante' }, { status: 500 });
  }
}
