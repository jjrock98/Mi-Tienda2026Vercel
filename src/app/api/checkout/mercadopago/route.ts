// src/app/api/checkout/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
    }

    // ── 1. Obtener la orden ──────────────────────────────────────────────
    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[MP Checkout] Orden no encontrada:', orderError);
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.estado !== 'pendiente') {
      return NextResponse.json({ error: `La orden está en estado "${order.estado}"` }, { status: 409 });
    }

    // ── 2. Construir items para MP ──────────────────────────────────────
    const items = order.order_items.map((item: any) => ({
      id: item.product_id,
      title: item.nombre_snap,
      quantity: item.cantidad_packs,
      unit_price: Number(item.precio_unit),
      currency_id: 'ARS',
      description: `${item.tipo_pack} - ${item.nombre_snap}`,
    }));

    // ── 3. Configurar la preferencia ─────────────────────────────────────
    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!mpAccessToken) {
      console.error('[MP Checkout] MERCADOPAGO_ACCESS_TOKEN no configurado');
      return NextResponse.json({ error: 'Configuración de pago incompleta' }, { status: 500 });
    }

    const preferenceData = {
      items,
      payer: {
        email: order.email,
        name: order.nombre,
        phone: { number: order.telefono || '' },
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

    // ── 4. Llamar a la API de MP ─────────────────────────────────────────
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': orderId,
      },
      body: JSON.stringify(preferenceData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MP Checkout] Error al crear preferencia:', data);
      const errorMsg = data.message || data.cause?.[0]?.description || 'Error al crear preferencia de pago';
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    // ── 5. Guardar preference_id en la orden ────────────────────────────
    await admin
      .from('orders')
      .update({
        mp_preference_id: data.id,
        external_reference: orderId,
        stock_reserved_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .eq('id', orderId);

    // ── 6. Responder con los puntos de inicio ──────────────────────────
    return NextResponse.json({
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    });

  } catch (error: any) {
    console.error('[MP Checkout] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al crear preferencia' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';