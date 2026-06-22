import { Resend } from 'resend';
import type { Order } from '@/types';
import {
  orderConfirmationHtml,
  orderStatusHtml,
  contactNotificationHtml,
  cashPaymentPendingHtml,
  // Nuevas plantillas cliente
  paymentConfirmedHtml,
  orderProcessingHtml,
  orderShippedHtml,
  orderDeliveredHtml,
  orderCancelledHtml,
  refundHtml,
  paymentReminderHtml,
  // Admin
  adminNewOrderHtml,
  adminPaymentConfirmedHtml,
  adminOrderCancelledHtml,
  adminRefundHtml,
  adminOrderStatusHtml, // 👈 NUEVA
} from './emails/templates';

const FROM  = `${process.env.RESEND_FROM_NAME ?? 'Mi Tienda'} <${process.env.RESEND_FROM_EMAIL ?? 'noreply@mitienda.com'}>`;
const ADMIN = process.env.RESEND_FROM_EMAIL ?? '';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY ?? 're_build_placeholder');
  }
  return resendClient;
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

// 1. Confirmación de pedido
export async function sendOrderConfirmationEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `Pedido #${order.id.slice(0, 8).toUpperCase()} confirmado ✓`,
    html:    orderConfirmationHtml(order),
  });
}

// 2. Estado genérico (cliente)
export async function sendOrderStatusEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `Tu pedido está ${order.estado} – ${process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda'}`,
    html:    orderStatusHtml(order),
  });
}

// 3. Contacto (cliente y admin)
export async function sendContactMessageEmail(
  nombre: string, email: string, asunto: string, mensaje: string
) {
  return getResendClient().emails.send({
    from:     FROM,
    to:       ADMIN,
    reply_to: email,
    subject:  `Nuevo contacto: ${asunto || nombre}`,
    html:     contactNotificationHtml(nombre, email, asunto, mensaje),
  });
}

// 4. Cupón de pago en efectivo (cliente)
export async function sendCashPaymentPendingEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `🧾 Tu cupón de pago fue generado — Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    cashPaymentPendingHtml(order),
  });
}

// 5. Pago acreditado (cliente)
export async function sendPaymentConfirmedEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `💰 Pago confirmado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    paymentConfirmedHtml(order),
  });
}

// 6. Pedido en preparación (cliente)
export async function sendOrderProcessingEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `📦 Tu pedido #${order.id.slice(0, 8).toUpperCase()} está en preparación`,
    html:    orderProcessingHtml(order),
  });
}

// 7. Pedido enviado (cliente, con tracking opcional)
export async function sendOrderShippedEmail(order: Order, trackingNumber?: string) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `🚚 Tu pedido #${order.id.slice(0, 8).toUpperCase()} fue enviado`,
    html:    orderShippedHtml(order, trackingNumber),
  });
}

// 8. Pedido entregado (cliente)
export async function sendOrderDeliveredEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `📬 Pedido #${order.id.slice(0, 8).toUpperCase()} entregado`,
    html:    orderDeliveredHtml(order),
  });
}

// 9. Pedido cancelado (cliente)
export async function sendOrderCancelledEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `❌ Pedido #${order.id.slice(0, 8).toUpperCase()} cancelado`,
    html:    orderCancelledHtml(order),
  });
}

// 10. Reembolso (cliente)
export async function sendRefundEmail(order: Order, reason: string) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `💳 Reembolso procesado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    refundHtml(order, reason),
  });
}

// 11. Recordatorio de pago (cliente)
export async function sendPaymentReminderEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `⏳ Recordatorio de pago – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    paymentReminderHtml(order),
  });
}

// ─── Administrador ────────────────────────────────────────────────────────────

// 12. Nuevo pedido (admin)
export async function sendAdminNewOrderEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `📦 Nuevo pedido #${order.id.slice(0, 8).toUpperCase()} recibido`,
    html:    adminNewOrderHtml(order),
  });
}

// 13. Pago confirmado (admin)
export async function sendAdminPaymentConfirmedEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `💰 Pago confirmado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    adminPaymentConfirmedHtml(order),
  });
}

// 14. Pedido cancelado (admin)
export async function sendAdminOrderCancelledEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `❌ Pedido #${order.id.slice(0, 8).toUpperCase()} cancelado`,
    html:    adminOrderCancelledHtml(order),
  });
}

// 15. Reembolso (admin)
export async function sendAdminRefundEmail(order: Order, reason: string) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `💳 Reembolso procesado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    adminRefundHtml(order, reason),
  });
}

// 16. 🔥 NUEVO: Cambio de estado (admin) – se ejecuta para cualquier otro cambio
export async function sendAdminOrderStatusEmail(order: Order, oldStatus: string, newStatus: string) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `📦 Pedido #${order.id.slice(0, 8).toUpperCase()} cambió a "${newStatus}"`,
    html:    adminOrderStatusHtml(order, oldStatus, newStatus),
  });
}