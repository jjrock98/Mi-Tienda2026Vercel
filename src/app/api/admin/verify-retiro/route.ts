import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { codigo } = await req.json();
  if (!codigo) return NextResponse.json({ error: 'Código requerido' }, { status: 400 });

  // Limpiar el código (mayúsculas, sin espacios)
  const codigoLimpio = codigo.trim().toUpperCase();

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from('orders')
    .select('*, order_items(nombre_snap, tipo_pack, cantidad_packs)')
    .eq('codigo_retiro', codigoLimpio)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Código inválido o pedido no encontrado' }, { status: 404 });
  }

  // Validar que el pedido esté en estado permitido para retiro
  const estadosPermitidos = ['pagado', 'procesando', 'enviado', 'entregado'];
  if (!estadosPermitidos.includes(order.estado)) {
    return NextResponse.json(
      {
        error: `El pedido está en estado "${order.estado}" y no está listo para retirar.`,
        estado: order.estado,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    order: {
      id: order.id,
      nombre: order.nombre,
      email: order.email,
      estado: order.estado,
      total: order.total,
      items: order.order_items,
      codigo_retiro: order.codigo_retiro,
      tipo_entrega: order.tipo_entrega,
    },
  });
}