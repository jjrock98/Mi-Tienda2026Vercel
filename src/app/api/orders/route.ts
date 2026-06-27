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

// ─── Helper para verificar admin ───
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single();
  return profile?.rol === 'admin' ? user : null;
}

// ─── POST: Crear nueva orden ───
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json();
  const { items, formData, subtotal, costo_envio, total } = body;

  // ── Validaciones ──
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
  }
  if (!formData?.nombre || !formData?.email || !formData?.telefono) {
    return NextResponse.json({ error: 'Faltan datos personales' }, { status: 400 });
  }
  if (formData.tipo_entrega === 'envio' && (!formData.direccion || !formData.ciudad || !formData.codigo_postal)) {
    return NextResponse.json({ error: 'Faltan datos de envío' }, { status: 400 });
  }

  // ── Obtener session_id para liberar reservas ──
  const sessionId = req.headers.get('x-session-id') || '';

  // ── Calcular unidades totales por producto ──
  const unidadesPorProducto: Record<string, number> = {};
  for (const item of items) {
    const unidades = item.unidades_por_item * item.cantidad_items;
    unidadesPorProducto[item.product_id] = (unidadesPorProducto[item.product_id] || 0) + unidades;
  }

  // ── Obtener datos de los productos ──
  const productIds = Object.keys(unidadesPorProducto);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, nombre, imagenes, stock_unidades')
    .in('id', productIds);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // ── Verificar stock ──
  for (const [productId, unidadesNecesarias] of Object.entries(unidadesPorProducto)) {
    const product = productMap.get(productId);
    if (!product) {
      return NextResponse.json({ error: `Producto ${productId} no encontrado` }, { status: 400 });
    }
    if (product.stock_unidades < unidadesNecesarias) {
      return NextResponse.json({
        error: `Stock insuficiente para ${product.nombre}. Disponible: ${product.stock_unidades}, necesario: ${unidadesNecesarias}`
      }, { status: 400 });
    }
  }

  // ── Insertar la orden ──
  const orderPayload = {
    user_id: user?.id || null,
    email: formData.email,
    nombre: formData.nombre,
    telefono: formData.telefono || null,
    direccion: formData.tipo_entrega === 'envio' ? formData.direccion : 'Retiro en local',
    ciudad: formData.tipo_entrega === 'envio' ? formData.ciudad : 'Retiro en local',
    codigo_postal: formData.tipo_entrega === 'envio' ? formData.codigo_postal : '0000',
    estado: 'pendiente',
    metodo_pago: formData.metodo_pago,
    tipo_entrega: formData.tipo_entrega,
    subtotal,
    costo_envio,
    total,
    notas: formData.notas || null,
    stock_descontado: false,
  };

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // ── Insertar items de la orden ──
  const orderItems = items.map((item: any) => {
    const product = productMap.get(item.product_id);
    return {
      order_id: order.id,
      product_id: item.product_id,
      tipo_venta: item.tipo_venta,
      tipo_pack: item.tipo_pack || null,
      unidades_por_item: item.unidades_por_item,
      cantidad_items: item.cantidad_items,
      unidades: item.unidades_por_item * item.cantidad_items,
      precio_unit: item.precio_unit,
      subtotal: item.precio_unit * item.cantidad_items,
      nombre_snap: product?.nombre || 'Producto',
      imagen_snap: product?.imagenes?.[0] || null,
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    // Si falla, eliminar la orden para no dejar datos huérfanos
    await supabase.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // ── Liberar reservas del carrito ──
  if (sessionId) {
    await supabase.rpc('liberar_reserva_carrito', {
      p_session_id: sessionId,
    });
  }

  // ── Enviar correo de confirmación ──
  try {
    await sendOrderStatusEmail(order);
  } catch (err) {
    console.error('Error enviando correo de confirmación:', err);
  }

  return NextResponse.json({ data: order });
}

// ─── PATCH: Actualizar estado de orden (admin) ───
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
          await sendOrderStatusEmail(order);
          break;
      }

      // Notificar al administrador del cambio de estado
      await sendAdminOrderStatusEmail(order, oldStatus, estado);

    } catch (err) {
      console.error('Error enviando correos de notificación:', err);
    }
  }

  return NextResponse.json({ ok: true, data: order });
}