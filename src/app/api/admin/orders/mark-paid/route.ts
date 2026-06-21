import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderStatusEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { orderId } = await req.json();
  const admin = createAdminClient();

  // Call atomic DB function
  const { data: result } = await admin.rpc('descontar_stock_seguro', { p_order_id: orderId });

  if (!result?.success) {
    return NextResponse.json({ error: result?.error || result?.errors?.join(', ') || 'Error al descontar stock' }, { status: 409 });
  }

  const { data: order } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (order) sendOrderStatusEmail(order).catch(console.error);

  return NextResponse.json({ ok: true });
}
