import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderStatusEmail } from '@/lib/email';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single();
  return profile?.rol === 'admin' ? user : null;
}

export async function PATCH(req: NextRequest) {
  const admin_user = await verifyAdmin();
  if (!admin_user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { orderId, estado } = await req.json();
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from('orders')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('*, order_items(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send status email
  if (order) sendOrderStatusEmail(order).catch(console.error);

  return NextResponse.json({ ok: true });
}
