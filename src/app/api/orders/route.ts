import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  sendOrderConfirmationEmail,
  sendAdminNewOrderEmail,
} from '@/lib/email';
import { createOrderSchema, parseBody } from '@/lib/validations';
import { rateLimiters } from '@/lib/rateLimit';
import type { TipoPack } from '@/types';
import { MP_COMMISSION } from '@/lib/constants';
import { randomBytes } from 'crypto'; // 👈 NUEVO

// ── Tipos internos ────────────────────────────────────────────────────────────
interface DBProduct {
  id: string;
  nombre: string;
  imagenes: string[];
  precio_media_docena: number;
  precio_docena: number;
  stock_unidades: number;
  activo: boolean;
}

interface ItemWithProduct {
  item:      { product_id: string; tipo_pack: TipoPack; cantidad_packs: number };
  product:   DBProduct;
  unidades:  number;
  precioUnit: number;
  orderItem: {
    product_id:    string;
    tipo_pack:     TipoPack;
    cantidad_packs: number;
    unidades:      number;
    precio_unit:   number;
    subtotal:      number;
    nombre_snap:   string;
    imagen_snap:   string | null;
  };
}

// ── Generación segura de código de retiro ──────────────────────────────────
function generarCodigoRetiro(): string {
  // 6 bytes = 48 bits, suficientes para 8 caracteres
  const bytes = randomBytes(6);
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excluye O,0,I,1
  let codigo = '';
  let valor = 0;
  for (let i = 0; i < bytes.length; i++) {
    valor = (valor << 8) + bytes[i];
  }
  for (let i = 0; i < 8; i++) {
    codigo += caracteres[valor % caracteres.length];
    valor = Math.floor(valor / caracteres.length);
  }
  return codigo;
}

export async function POST(req: NextRequest) {
  const limited = rateLimiters.orders(req);
  if (limited) return limited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const rawBody = await req.json();
    const { data: body, error: validationError } = parseBody(createOrderSchema, rawBody);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 422 });
    if (!body) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 });

    const { items, formData, subtotal, costo_envio, total } = body;
    const admin = createAdminClient();

    // Validar stock y calcular precios en el servidor
    const itemsWithProducts: ItemWithProduct[] = await Promise.all(
      items.map(async (item) => {
        const { data: product } = await admin
          .from('products')
          .select('id, nombre, imagenes, precio_media_docena, precio_docena, stock_unidades, activo')
          .eq('id', item.product_id)
          .single();

        if (!product)        throw new Error(`Producto no encontrado: ${item.product_id}`);
        if (!product.activo) throw new Error(`"${product.nombre}" ya no está disponible`);

        const unidades = item.cantidad_packs * (item.tipo_pack === 'media_docena' ? 6 : 12);
        if (product.stock_unidades < unidades) {
          throw new Error(
            `Stock insuficiente para "${product.nombre}": hay ${product.stock_unidades} unidades, necesitás ${unidades}`
          );
        }

        const precioUnit = item.tipo_pack === 'media_docena'
          ? product.precio_media_docena
          : product.precio_docena;

        return {
          item,
          product,
          unidades,
          precioUnit,
          orderItem: {
            product_id:     item.product_id,
            tipo_pack:      item.tipo_pack,
            cantidad_packs: item.cantidad_packs,
            unidades,
            precio_unit:    precioUnit,
            subtotal:       item.cantidad_packs * precioUnit,
            nombre_snap:    product.nombre,
            imagen_snap:    product.imagenes?.[0] ?? null,
          },
        };
      })
    );

    // Validación server-side de precios (evita price tampering)
    const expectedSubtotal = itemsWithProducts.reduce(
      (acc: number, { item, precioUnit }: ItemWithProduct) =>
        acc + item.cantidad_packs * precioUnit,
      0
    );
    if (Math.abs(expectedSubtotal - subtotal) > 1) {
      return NextResponse.json(
        { error: 'Los precios han cambiado. Por favor, actualizá el carrito.' },
        { status: 409 }
      );
    }

    // ✅ Validación del total según método de pago
    const metodoPago = formData.metodo_pago;
    let totalEsperado = subtotal + costo_envio;
    if (metodoPago === 'mercadopago') {
      totalEsperado = subtotal * (1 + MP_COMMISSION) + costo_envio;
    }

    if (Math.abs(totalEsperado - total) > 0.01) {
      console.warn('⚠️ Total manipulado:', { esperado: totalEsperado, recibido: total, metodo: metodoPago });
      return NextResponse.json(
        { error: 'El total no coincide. Por favor, recargá la página y volvé a intentar.' },
        { status: 409 }
      );
    }

    // ── Insertar orden (con código de retiro) ──
    const codigoRetiro = formData.tipo_entrega === 'retiro' ? generarCodigoRetiro() : null;

    const { data: order, error: orderErr } = await admin.from('orders').insert({
      user_id:       user.id,
      email:         formData.email,
      nombre:        formData.nombre,
      telefono:      formData.telefono,
      direccion:     formData.tipo_entrega === 'retiro' ? 'Retiro en local' : formData.direccion,
      ciudad:        formData.tipo_entrega === 'retiro' ? 'Retiro en local' : formData.ciudad,
      codigo_postal: formData.tipo_entrega === 'retiro' ? '0000'            : formData.codigo_postal,
      notas:         formData.notas ?? null,
      metodo_pago:   formData.metodo_pago,
      tipo_entrega:  formData.tipo_entrega,
      subtotal,
      costo_envio,
      total: totalEsperado,
      estado: 'pendiente',
      codigo_retiro: codigoRetiro, // 👈 NUEVO
    }).select().single();

    if (orderErr) throw orderErr;

    const { error: itemsErr } = await admin.from('order_items').insert(
      itemsWithProducts.map(({ orderItem }: ItemWithProduct) => ({
        order_id: order.id,
        ...orderItem,
      }))
    );
    if (itemsErr) throw itemsErr;

    // ── Email no bloqueante ──
    admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const fullOrder = data as Parameters<typeof sendOrderConfirmationEmail>[0];
          // Enviar confirmación al cliente
          sendOrderConfirmationEmail(fullOrder).catch(console.error);
          // Enviar notificación al administrador
          sendAdminNewOrderEmail(fullOrder).catch(console.error);
        }
      });

    return NextResponse.json({ data: order });
  } catch (err: unknown) {
    console.error('Order error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al crear el pedido' },
      { status: 500 }
    );
  }
}