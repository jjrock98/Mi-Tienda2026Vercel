import type { Order } from '@/types';
import { ORDER_STATUS_LABELS, getCashCouponExpiry } from '@/utils';

const BRAND_COLOR = '#d98e1e';
const TIENDA      = process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda';
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL       ?? '';

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);
}

function base(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td style="background:${BRAND_COLOR};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;"><p style="margin:0;color:#fff;font-size:22px;font-weight:800;">${TIENDA}</p></td></tr>
<tr><td style="background:#ffffff;padding:36px 32px;border-radius:0 0 12px 12px;">${body}</td></tr>
<tr><td style="padding:20px 32px;text-align:center;"><p style="margin:0;color:#9ca3af;font-size:12px;">${TIENDA} · <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${APP_URL.replace('https://','')}</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Confirmación de orden (PERSONALIZADA) ──────────────────────────────────
export function orderConfirmationHtml(
  order: Order,
  tipoEntrega: 'envio' | 'retiro',
  metodoPago: 'mercadopago' | 'transferencia',
  bankInfo?: { titular: string; cbu: string; alias: string; banco: string } | null,
  locationInfo?: { direccion: string; horario: string; mapaUrl: string } | null
): string {
  const itemRows = (order.order_items ?? []).map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
        ${item.nombre_snap}<span style="color:#9ca3af;font-size:12px;display:block;">${item.tipo_pack === 'media_docena' ? 'Media docena (6 uds)' : 'Docena (12 uds)'} × ${item.cantidad_packs}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;font-weight:600;">${formatARS(item.subtotal)}</td>
    </tr>`).join('');

  // ── Bloque de pago ──
  let pagoHtml = '';
  if (metodoPago === 'transferencia') {
    if (bankInfo) {
      pagoHtml = `
        <div style="background:#f0f4ff;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a2e;">💳 Datos de transferencia</p>
          <p style="margin:2px 0;font-size:13px;color:#374151;"><strong>Titular:</strong> ${bankInfo.titular || 'No especificado'}</p>
          <p style="margin:2px 0;font-size:13px;color:#374151;"><strong>CBU:</strong> ${bankInfo.cbu || 'No especificado'}</p>
          <p style="margin:2px 0;font-size:13px;color:#374151;"><strong>Alias:</strong> ${bankInfo.alias || 'No especificado'}</p>
          <p style="margin:2px 0;font-size:13px;color:#374151;"><strong>Banco:</strong> ${bankInfo.banco || 'No especificado'}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">⚠️ Envía el comprobante de transferencia para confirmar tu pago.</p>
        </div>
      `;
    } else {
      pagoHtml = `
        <div style="background:#f0f4ff;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:#374151;">📌 Realiza una transferencia bancaria. Te enviaremos los datos por separado.</p>
        </div>
      `;
    }
  } else {
    // Mercado Pago
    pagoHtml = `
      <div style="background:#d4edda;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#155724;">✅ Pago procesado</p>
        <p style="margin:0;font-size:13px;color:#155724;">Tu pago se realizó correctamente a través de Mercado Pago.</p>
      </div>
    `;
  }

  // ── Bloque de entrega (con código de retiro solo si pago confirmado) ──
  let entregaHtml = '';
  if (tipoEntrega === 'retiro') {
    const direccion = locationInfo?.direccion ?? 'Dirección no especificada';
    const horario = locationInfo?.horario ?? 'Horario no especificado';
    const mapaUrl = locationInfo?.mapaUrl ?? '#';
    const codigoRetiro = order.codigo_retiro ?? '---';

    // ✅ Estados que indican pago confirmado
    const pagoConfirmado = ['pagado', 'procesando', 'enviado', 'entregado'].includes(order.estado);

    let codigoHtml = '';
    if (pagoConfirmado && codigoRetiro && !codigoRetiro.includes('undefined')) {
      codigoHtml = `
        <div style="background:#fff;border:2px dashed #d98e1e;border-radius:8px;padding:12px;margin:12px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Código de retiro</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:900;color:#1a1a2e;font-family:monospace;letter-spacing:2px;">${codigoRetiro}</p>
        </div>
      `;
    } else {
      codigoHtml = `
        <div style="background:#e7f3ff;border-radius:8px;padding:12px;margin:12px 0;text-align:center;border:1px dashed #1a1a2e;">
          <p style="margin:0;font-size:13px;color:#1a1a2e;">🔒 El código de retiro estará disponible una vez que se confirme el pago.</p>
        </div>
      `;
    }

    entregaHtml = `
      <div style="background:#fdf8f0;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a2e;">📍 Retiro en local</p>
        <p style="margin:2px 0;font-size:13px;color:#374151;"><strong>Dirección:</strong> ${direccion}</p>
        <p style="margin:2px 0;font-size:13px;color:#374151;"><strong>Horario de atención:</strong> ${horario}</p>
        ${codigoHtml}
        <p style="margin:10px 0 0;">
          <a href="${mapaUrl}" target="_blank" style="display:inline-block;background:#d98e1e;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;">Ver en Google Maps</a>
        </p>
        ${pagoConfirmado ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;">📌 Presentate con tu DNI y este código para retirar tu pedido.</p>` : ''}
      </div>
    `;
  } else {
    entregaHtml = `
      <div style="background:#e7f3ff;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1a1a2e;">🚚 Envío a domicilio</p>
        <p style="margin:2px 0;font-size:13px;color:#374151;"><strong>Dirección:</strong> ${order.direccion}, ${order.ciudad} (CP: ${order.codigo_postal})</p>
        <p style="margin:2px 0;font-size:13px;color:#374151;"><strong>Teléfono:</strong> ${order.telefono || 'No especificado'}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">📦 El tiempo estimado de entrega es de <strong>2 a 5 días hábiles</strong>.</p>
      </div>
    `;
  }

  // ── Cuerpo del correo ──
  const body = `
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#111827;">¡Gracias por tu compra!</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hola <strong style="color:#374151;">${order.nombre}</strong>, tu pedido fue confirmado.</p>
    <div style="background:#fdf8f0;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">Número de pedido</p>
      <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:${BRAND_COLOR};font-family:monospace;">#${order.id.slice(0,8).toUpperCase()}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tbody>${itemRows}</tbody></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="padding:5px 0;font-size:14px;color:#6b7280;">Subtotal</td><td style="text-align:right;font-size:14px;">${formatARS(order.subtotal)}</td></tr>
      <tr><td style="padding:5px 0;font-size:14px;color:#6b7280;">Envío</td><td style="text-align:right;font-size:14px;">${formatARS(order.costo_envio)}</td></tr>
      <tr><td style="padding:10px 0 0;font-size:16px;font-weight:700;border-top:2px solid #f3f4f6;">Total</td><td style="padding:10px 0 0;font-size:18px;font-weight:800;color:${BRAND_COLOR};text-align:right;border-top:2px solid #f3f4f6;">${formatARS(order.total)}</td></tr>
    </table>
    ${pagoHtml}
    ${entregaHtml}
    <div style="text-align:center;margin-top:20px;">
      <a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mi pedido</a>
    </div>
  `;

  return base(`Pedido #${order.id.slice(0,8).toUpperCase()} confirmado`, body);
}

// ─── Estado actualizado (genérico) ──────────────────────────────────────────
export function orderStatusHtml(order: Order): string {
  const msgs: Record<string, string> = {
    pagado: 'Tu pago fue confirmado. Estamos preparando tu pedido.',
    procesando: 'Estamos preparando tu pedido.',
    enviado: 'Tu pedido está en camino. ¡Pronto llegará!',
    entregado: '¡Tu pedido fue entregado exitosamente!',
    cancelado: 'Tu pedido fue cancelado. Si tenés dudas, contactanos.',
    pendiente_pago: 'Tu cupón de pago en efectivo fue generado.',
  };

  const body = `
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#111827;">Actualización de tu pedido</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hola <strong style="color:#374151;">${order.nombre}</strong>,</p>
    <div style="background:#fdf8f0;border-left:4px solid ${BRAND_COLOR};padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;">Estado actual</p>
      <p style="margin:0;font-size:20px;font-weight:800;color:${BRAND_COLOR};">${ORDER_STATUS_LABELS[order.estado] ?? order.estado}</p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.6;">${msgs[order.estado] ?? 'El estado de tu pedido fue actualizado.'}</p>
    <p style="font-size:13px;color:#9ca3af;margin:0 0 24px;">Pedido <strong style="color:#374151;font-family:monospace;">#${order.id.slice(0,8).toUpperCase()}</strong> · Total: <strong style="color:#374151;">${formatARS(order.total)}</strong></p>
    <div style="text-align:center;"><a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mi pedido</a></div>`;

  return base(`Tu pedido está ${ORDER_STATUS_LABELS[order.estado]?.toLowerCase() ?? 'actualizado'}`, body);
}

// ─── Contacto ─────────────────────────────────────────────────────────────────
export function contactNotificationHtml(nombre: string, email: string, asunto: string, mensaje: string): string {
  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">Nuevo mensaje de contacto</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Recibiste un mensaje a través del formulario.</p>
    <table width="100%" style="margin-bottom:20px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#9ca3af;width:80px;">De</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;">${nombre} &lt;${email}&gt;</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#9ca3af;">Asunto</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;">${asunto || '(sin asunto)'}</td></tr>
    </table>
    <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${mensaje.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
    </div>
    <a href="mailto:${email}?subject=Re: ${encodeURIComponent(asunto ?? '')}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;">Responder a ${nombre}</a>`;

  return base(`Nuevo mensaje: ${asunto || nombre}`, body);
}

// ─── Cupón de pago en efectivo ──────────────────────────────────────────────
export function cashPaymentPendingHtml(order: Order): string {
  const expiryDate  = getCashCouponExpiry(order.created_at);
  const orderNumber = order.id.slice(0, 8).toUpperCase();

  const steps = [
    ['1', 'Revisá tu email de Mercado Pago', 'Te enviaron el cupón con el código de barras para pagar.'],
    ['2', 'Andá a un punto de pago habilitado', 'Rapipago, Pago Fácil, Provincia NET, Cobroexpress y otros.'],
    ['3', `Pagá exactamente ${formatARS(order.total)}`, 'Mostrá el código y abonalo en efectivo.'],
    ['4', 'Tu pedido se confirma solo', 'Una vez acreditado, te enviamos un email de confirmación.'],
  ];

  const stepsHtml = steps.map(([num, title, desc]) => `
    <tr>
      <td style="width:36px;vertical-align:top;padding:0 12px 16px 0;">
        <div style="width:28px;height:28px;background:${BRAND_COLOR};border-radius:50%;text-align:center;line-height:28px;color:#fff;font-size:13px;font-weight:800;">${num}</div>
      </td>
      <td style="vertical-align:top;padding-bottom:16px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${title}</p>
        <p style="margin:3px 0 0;font-size:13px;color:#6b7280;">${desc}</p>
      </td>
    </tr>`).join('');

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:48px;">🧾</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">¡Cupón generado!</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;text-align:center;line-height:1.6;">
      Hola <strong style="color:#374151;">${order.nombre}</strong>,<br>tu pedido está reservado. Completá el pago en efectivo para confirmarlo.
    </p>

    <div style="background:#fdf8f0;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:16px;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Número de pedido</p>
      <p style="margin:0;font-size:24px;font-weight:900;color:${BRAND_COLOR};font-family:monospace;">#${orderNumber}</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#111827;">Total: ${formatARS(order.total)}</p>
    </div>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#9a3412;font-weight:700;">⚠️ El cupón vence el ${expiryDate}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#c2410c;">Si no pagás antes, el pedido se cancelará automáticamente.</p>
    </div>

    <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 16px;">¿Qué hacer ahora?</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tbody>${stepsHtml}</tbody></table>

    <div style="text-align:center;">
      <a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver estado de mi pedido</a>
    </div>`;

  return base(`Cupón generado — Pedido #${orderNumber}`, body);
}

// ─── Pago acreditado (cliente) ──────────────────────────────────────────────
export function paymentConfirmedHtml(order: Order): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">💰</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">¡Pago confirmado!</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;text-align:center;">
      Hola <strong style="color:#374151;">${order.nombre}</strong>, el pago de tu pedido <strong>#${order.id.slice(0,8).toUpperCase()}</strong> fue acreditado.
    </p>
    <div style="background:#d4edda;border-left:4px solid #28a745;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#155724;"><strong>✅ Monto:</strong> ${formatARS(order.total)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#155724;"><strong>📅 Fecha:</strong> ${new Date(order.updated_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.6;">
      Ya estamos preparando tu pedido para el envío. En breve recibirás una notificación con el número de seguimiento.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mi pedido</a>
    </div>`;
  return base('Pago confirmado', body);
}

// ─── Pedido en preparación (cliente) ────────────────────────────────────────
export function orderProcessingHtml(order: Order): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">📦</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">Tu pedido está en preparación</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;text-align:center;">
      Hola <strong style="color:#374151;">${order.nombre}</strong>, tu pedido <strong>#${order.id.slice(0,8).toUpperCase()}</strong> ya está siendo armado por nuestro equipo.
    </p>
    <div style="background:#e7f3ff;border-left:4px solid #1a1a2e;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>📦 Estado:</strong> Procesando</p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.6;">
      Te avisaremos cuando sea enviado. El tiempo estimado de entrega es de <strong>2 a 5 días hábiles</strong>.<br>
      ¿Necesitas modificar algo? Respondé a este correo lo antes posible.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mi pedido</a>
    </div>`;
  return base('Pedido en preparación', body);
}

// ─── Pedido enviado (cliente) ────────────────────────────────────────────────
export function orderShippedHtml(order: Order, trackingNumber?: string): string {
  const trackingHtml = trackingNumber ? `
    <p style="margin:6px 0 0;font-size:14px;font-weight:600;color:#111827;">📦 Número de seguimiento: ${trackingNumber}</p>
  ` : '';

  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">🚚</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">¡Tu pedido está en camino!</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;text-align:center;">
      Hola <strong style="color:#374151;">${order.nombre}</strong>, tu pedido <strong>#${order.id.slice(0,8).toUpperCase()}</strong> fue despachado.
    </p>
    <div style="background:#e7f3ff;border-left:4px solid #1a1a2e;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>🚚 Estado:</strong> Enviado</p>
      ${trackingHtml}
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.6;">
      El tiempo estimado de entrega es de <strong>2 a 5 días hábiles</strong>.<br>
      Si no recibís tu pedido en el plazo estimado, contactanos a <a href="mailto:soporte@mc-importados.xyz">soporte@mc-importados.xyz</a>.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mi pedido</a>
    </div>`;
  return base('Pedido enviado', body);
}

// ─── Pedido entregado (cliente) ──────────────────────────────────────────────
export function orderDeliveredHtml(order: Order): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">📬</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">¡Tu pedido fue entregado!</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;text-align:center;">
      Hola <strong style="color:#374151;">${order.nombre}</strong>, tu pedido <strong>#${order.id.slice(0,8).toUpperCase()}</strong> fue entregado exitosamente.
    </p>
    <div style="background:#d4edda;border-left:4px solid #28a745;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#155724;"><strong>✅ Estado:</strong> Entregado</p>
      <p style="margin:4px 0 0;font-size:13px;color:#155724;"><strong>📅 Fecha:</strong> ${new Date(order.updated_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.6;">
      ¡Esperamos que disfrutes tu compra! Si tenés algún inconveniente, no dudes en contactarnos.<br>
      Te invitamos a dejar una reseña de los productos que adquiriste. ¡Tu opinión nos ayuda a mejorar!
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mi pedido</a>
    </div>`;
  return base('Pedido entregado', body);
}

// ─── Pedido cancelado (cliente) ──────────────────────────────────────────────
export function orderCancelledHtml(order: Order): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">❌</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">Pedido cancelado</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;text-align:center;">
      Hola <strong style="color:#374151;">${order.nombre}</strong>, tu pedido <strong>#${order.id.slice(0,8).toUpperCase()}</strong> fue cancelado.
    </p>
    <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#856404;"><strong>⚠️ Motivo:</strong> ${order.rejection_reason || 'No especificado'}</p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.6;">
      Si no solicitaste esta cancelación, por favor <a href="mailto:soporte@mc-importados.xyz">contáctanos</a> inmediatamente.<br>
      Si ya realizaste el pago, el reembolso se procesará en un plazo de <strong>5 a 10 días hábiles</strong> (según el método de pago).
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mis pedidos</a>
    </div>`;
  return base('Pedido cancelado', body);
}

// ─── Reembolso (cliente) ─────────────────────────────────────────────────────
export function refundHtml(order: Order, reason: string): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">💳</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">Reembolso procesado</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;text-align:center;">
      Hola <strong style="color:#374151;">${order.nombre}</strong>, hemos procesado el reembolso de tu pedido <strong>#${order.id.slice(0,8).toUpperCase()}</strong>.
    </p>
    <div style="background:#e7f3ff;border-left:4px solid #1a1a2e;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>💰 Monto reembolsado:</strong> ${formatARS(order.total)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>📝 Motivo:</strong> ${reason}</p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.6;">
      El reembolso se verá reflejado en tu cuenta en un plazo de <strong>5 a 10 días hábiles</strong> (según tu banco o método de pago).<br>
      Si no recibís el reembolso en ese plazo, contactanos a <a href="mailto:soporte@mc-importados.xyz">soporte@mc-importados.xyz</a>.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mis pedidos</a>
    </div>`;
  return base('Reembolso procesado', body);
}

// ─── Recordatorio de pago (cliente) ──────────────────────────────────────────
export function paymentReminderHtml(order: Order): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">⏳</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">Recordatorio de pago</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;text-align:center;">
      Hola <strong style="color:#374151;">${order.nombre}</strong>, tu pedido <strong>#${order.id.slice(0,8).toUpperCase()}</strong> aún no ha sido pagado.
    </p>
    <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#856404;"><strong>⏳ Estado:</strong> Pendiente de pago</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#856404;"><strong>💰 Total a pagar:</strong> ${formatARS(order.total)}</p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 24px;line-height:1.6;">
      Para completar tu compra, realizá el pago a través del siguiente enlace:
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${APP_URL}/pago/${order.id}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Pagar ahora</a>
    </div>
    <p style="font-size:13px;color:#6b7280;margin:0;">Si ya realizaste el pago, <strong>ignorá este mensaje</strong>.</p>`;
  return base('Recordatorio de pago', body);
}

// ─── ADMIN: Nuevo pedido ──────────────────────────────────────────────────────
export function adminNewOrderHtml(order: Order): string {
  const itemsList = (order.order_items ?? []).map(item =>
    `- ${item.nombre_snap} (${item.tipo_pack === 'media_docena' ? 'Media docena' : 'Docena'} x ${item.cantidad_packs}) - ${formatARS(item.subtotal)}`
  ).join('\n');

  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">📦</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">¡Nuevo pedido recibido!</h1>
    <div style="background:#e7f3ff;border-left:4px solid #1a1a2e;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>Pedido #${order.id.slice(0,8).toUpperCase()}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Cliente:</strong> ${order.nombre} (${order.email})</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Total:</strong> ${formatARS(order.total)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Método de pago:</strong> ${order.metodo_pago === 'mercadopago' ? 'Mercado Pago' : 'Transferencia'}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Entrega:</strong> ${order.tipo_entrega === 'envio' ? 'Envío a domicilio' : 'Retiro en local'}</p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 12px;"><strong>Productos:</strong></p>
    <pre style="background:#f9fafb;padding:12px 16px;border-radius:8px;font-size:13px;color:#374151;white-space:pre-wrap;margin-bottom:24px;">${itemsList}</pre>
    <div style="text-align:center;">
      <a href="${APP_URL}/admin/pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:700;">Gestionar pedido</a>
    </div>`;
  return base(`📦 Nuevo pedido #${order.id.slice(0,8).toUpperCase()}`, body);
}

// ─── ADMIN: Pago confirmado ──────────────────────────────────────────────────
export function adminPaymentConfirmedHtml(order: Order): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">💰</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">Pago confirmado</h1>
    <div style="background:#d4edda;border-left:4px solid #28a745;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#155724;"><strong>Pedido #${order.id.slice(0,8).toUpperCase()}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#155724;"><strong>Cliente:</strong> ${order.nombre}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#155724;"><strong>Total:</strong> ${formatARS(order.total)}</p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/admin/pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:700;">Ver pedido</a>
    </div>`;
  return base('Pago confirmado (admin)', body);
}

// ─── ADMIN: Pedido cancelado ─────────────────────────────────────────────────
export function adminOrderCancelledHtml(order: Order): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">❌</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">Pedido cancelado</h1>
    <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#856404;"><strong>Pedido #${order.id.slice(0,8).toUpperCase()}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#856404;"><strong>Cliente:</strong> ${order.nombre}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#856404;"><strong>Motivo:</strong> ${order.rejection_reason || 'No especificado'}</p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/admin/pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:700;">Ver pedido</a>
    </div>`;
  return base('Pedido cancelado (admin)', body);
}

// ─── ADMIN: Reembolso ────────────────────────────────────────────────────────
export function adminRefundHtml(order: Order, reason: string): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">💳</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">Reembolso procesado</h1>
    <div style="background:#e7f3ff;border-left:4px solid #1a1a2e;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>Pedido #${order.id.slice(0,8).toUpperCase()}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Cliente:</strong> ${order.nombre}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Monto:</strong> ${formatARS(order.total)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Motivo:</strong> ${reason}</p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/admin/pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:700;">Ver pedido</a>
    </div>`;
  return base('Reembolso procesado (admin)', body);
}

// ─── ADMIN: Cambio de estado ─────────────────────────────────────────────────
export function adminOrderStatusHtml(order: Order, oldStatus: string, newStatus: string): string {
  const body = `
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:42px;">📦</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center;">Cambio de estado del pedido</h1>
    <div style="background:#e7f3ff;border-left:4px solid #1a1a2e;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>Pedido #${order.id.slice(0,8).toUpperCase()}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Cliente:</strong> ${order.nombre} (${order.email})</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;"><strong>Total:</strong> ${formatARS(order.total)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;">
        <strong>Estado anterior:</strong> ${ORDER_STATUS_LABELS[oldStatus as keyof typeof ORDER_STATUS_LABELS] || oldStatus}
      </p>
      <p style="margin:4px 0 0;font-size:13px;color:#1a1a2e;">
        <strong>Nuevo estado:</strong> ${ORDER_STATUS_LABELS[newStatus as keyof typeof ORDER_STATUS_LABELS] || newStatus}
      </p>
    </div>
    <p style="font-size:15px;color:#374151;margin:0 0 24px;line-height:1.6;">
      El pedido ha cambiado de estado. Verificá los detalles en el panel de administración.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/admin/pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:700;">Ver pedido</a>
    </div>`;
  return base('Cambio de estado (admin)', body);
}