// src/app/api/create-mp-preference/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MP_COMMISSION } from '@/lib/constants';

// Definir tipos locales (para evitar errores de any implícito)
interface OrderItem {
  id: string;
  product_id: string;
  tipo_venta: 'pack' | 'curva';      // ✅ nuevo campo
  tipo_pack: string | null;          // puede ser null para curva
  unidades_por_item: number;         // ✅ nuevo campo
  cantidad_items: number;            // ✅ nuevo campo (reemplaza cantidad_packs)
  unidades: number;
  precio_unit: number;
  subtotal: number;
  nombre_snap: string;
  imagen_snap: string | null;
}

interface Order {
  id: string;
  estado: string;
  email: string;
  nombre: string;
  telefono: string | null;
  total: number;
  // otros campos...
  order_items: OrderItem[];
}

export async function POST(req: NextRequest) {
  console.log('🚀🚀🚀 ENDPOINT DE CHECKOUT (NUEVA RUTA) EJECUTADO 🚀🚀🚀');

  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[MP] Orden no encontrada:', orderError);
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Cast a Order para tener tipos
    const orderData = order as Order;

    if (orderData.estado !== 'pendiente') {
      return NextResponse.json({ error: `La orden está en estado "${orderData.estado}"` }, { status: 409 });
    }

    const commission = typeof MP_COMMISSION === 'number' ? MP_COMMISSION : 0.07;

    // 1️⃣ Construir items con precios que incluyan el recargo de MP
    // ✅ Usamos cantidad_items (número de curvas o packs) y precio_unit (precio por curva o pack)
    const items = orderData.order_items.map((item: OrderItem) => {
      const basePrice = Number(item.precio_unit);
      const priceWithCommission = basePrice * (1 + commission);

      // Determinar la descripción según el tipo de venta
      let description = '';
      if (item.tipo_venta === 'curva') {
        description = `Curva de ${item.unidades_por_item} unidades`;
      } else {
        const packLabel = item.tipo_pack === 'media_docena' ? 'Media docena' : 'Docena';
        description = `${packLabel} (${item.unidades_por_item} unidades)`;
      }

      return {
        id: item.product_id,
        title: item.nombre_snap,
        quantity: item.cantidad_items,  // ✅ usando cantidad_items (siempre es un número)
        unit_price: Math.round(priceWithCommission * 100) / 100,
        currency_id: 'ARS',
        description: description,
      };
    });

    // 2️⃣ Ajustar el último ítem para que la suma coincida exactamente con `order.total`
    const totalOrder = Number(orderData.total);
    let sumItems = items.reduce((acc: number, item) => acc + (item.unit_price * item.quantity), 0);
    const diff = Math.round((totalOrder - sumItems) * 100) / 100;

    if (Math.abs(diff) > 0.01 && items.length > 0) {
      const lastItem = items[items.length - 1];
      const newUnitPrice = Math.round((lastItem.unit_price + diff / lastItem.quantity) * 100) / 100;
      lastItem.unit_price = newUnitPrice;
      console.log(`⚖️ Ajuste de precio para coincidir con el total: +${diff} en "${lastItem.title}"`);
    }

    // 3️⃣ Variables de entorno
    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!mpAccessToken) {
      return NextResponse.json({ error: 'Falta Access Token de MP' }, { status: 500 });
    }

    // 4️⃣ Construir la preferencia
    const preferenceData = {
      items,
      payer: {
        email: orderData.email,
        name: orderData.nombre,
        phone: { number: orderData.telefono || '' },
      },
      external_reference: orderId,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${appUrl}/pago/exitoso?order_id=${orderId}`,
        pending: `${appUrl}/pago/pendiente?order_id=${orderId}`,
        failure: `${appUrl}/pago/error?order_id=${orderId}`,
      },
      auto_return: 'approved',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      statement_descriptor: process.env.NEXT_PUBLIC_TIENDA_NOMBRE || 'Mi Tienda',
      payment_methods: {
        excluded_payment_types: [],
        installments: 12,
      },
    };

    console.log('📦 Items enviados a MP:', JSON.stringify(items, null, 2));

    // 5️⃣ Llamar a la API de MP
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': orderId,
      },
      body: JSON.stringify(preferenceData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MP] Error completo:', JSON.stringify(data, null, 2));
      const msg = data.message || data.cause?.[0]?.description || 'Error al crear preferencia';
      return NextResponse.json({ error: msg, detail: data }, { status: response.status });
    }

    // 6️⃣ Guardar preference_id en la orden
    await admin
      .from('orders')
      .update({
        mp_preference_id: data.id,
        external_reference: orderId,
        stock_reserved_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .eq('id', orderId);

    console.log('✅ Preferencia creada:', data.id);
    console.log('🔗 initPoint:', data.init_point);
    console.log('🔗 sandboxInitPoint:', data.sandbox_init_point);

    return NextResponse.json({
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    });
  } catch (error: any) {
    console.error('[MP] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al crear preferencia' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';