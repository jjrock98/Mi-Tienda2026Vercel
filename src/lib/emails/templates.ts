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

// ─── Confirmación de orden ────────────────────────────────────────────────────

export function orderConfirmationHtml(order: Order): string {
  const itemRows = (order.order_items ?? []).map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">
        ${item.nombre_snap}<span style="color:#9ca3af;font-size:12px;display:block;">${item.tipo_pack === 'media_docena' ? 'Media docena (6 uds)' : 'Docena (12 uds)'} × ${item.cantidad_packs}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;font-weight:600;">${formatARS(item.subtotal)}</td>
    </tr>`).join('');

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
    <div style="text-align:center;"><a href="${APP_URL}/mis-pedidos" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Ver mi pedido</a></div>`;

  return base(`Pedido #${order.id.slice(0,8).toUpperCase()} confirmado`, body);
}

// ─── Estado actualizado ───────────────────────────────────────────────────────

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

// ─── NUEVO: Cupón de pago en efectivo ────────────────────────────────────────

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
