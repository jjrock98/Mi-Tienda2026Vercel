import { Resend } from 'resend';
import type { Order } from '@/types';
import {
  orderConfirmationHtml,
  orderStatusHtml,
  contactNotificationHtml,
  cashPaymentPendingHtml,
  paymentConfirmedHtml,
  orderProcessingHtml,
  orderShippedHtml,
  orderDeliveredHtml,
  orderCancelledHtml,
  refundHtml,
  paymentReminderHtml,
  adminNewOrderHtml,
  adminPaymentConfirmedHtml,
  adminOrderCancelledHtml,
  adminRefundHtml,
  adminOrderStatusHtml,
} from './emails/templates';

// ─── Configuración de correos ────────────────────────────────────────────────
const FROM  = `${process.env.RESEND_FROM_NAME ?? 'Mi Tienda'} <${process.env.RESEND_FROM_EMAIL ?? 'noreply@mitienda.com'}>`;
// ✅ ADMIN usa ADMIN_EMAIL si existe, si no, usa RESEND_FROM_EMAIL como fallback
const ADMIN = process.env.ADMIN_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? '';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY ?? 're_build_placeholder');
  }
  return resendClient;
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `Pedido #${order.id.slice(0, 8).toUpperCase()} confirmado ✓`,
    html:    orderConfirmationHtml(order),
  });
}

export async function sendOrderStatusEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `Tu pedido está ${order.estado} – ${process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda'}`,
    html:    orderStatusHtml(order),
  });
}

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

export async function sendCashPaymentPendingEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `🧾 Tu cupón de pago fue generado — Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    cashPaymentPendingHtml(order),
  });
}

export async function sendPaymentConfirmedEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `💰 Pago confirmado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    paymentConfirmedHtml(order),
  });
}

export async function sendOrderProcessingEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `📦 Tu pedido #${order.id.slice(0, 8).toUpperCase()} está en preparación`,
    html:    orderProcessingHtml(order),
  });
}

export async function sendOrderShippedEmail(order: Order, trackingNumber?: string) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `🚚 Tu pedido #${order.id.slice(0, 8).toUpperCase()} fue enviado`,
    html:    orderShippedHtml(order, trackingNumber),
  });
}

export async function sendOrderDeliveredEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `📬 Pedido #${order.id.slice(0, 8).toUpperCase()} entregado`,
    html:    orderDeliveredHtml(order),
  });
}

export async function sendOrderCancelledEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `❌ Pedido #${order.id.slice(0, 8).toUpperCase()} cancelado`,
    html:    orderCancelledHtml(order),
  });
}

export async function sendRefundEmail(order: Order, reason: string) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `💳 Reembolso procesado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    refundHtml(order, reason),
  });
}

export async function sendPaymentReminderEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      order.email,
    subject: `⏳ Recordatorio de pago – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    paymentReminderHtml(order),
  });
}

// ─── Administrador ────────────────────────────────────────────────────────────

export async function sendAdminNewOrderEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `📦 Nuevo pedido #${order.id.slice(0, 8).toUpperCase()} recibido`,
    html:    adminNewOrderHtml(order),
  });
}

export async function sendAdminPaymentConfirmedEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `💰 Pago confirmado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    adminPaymentConfirmedHtml(order),
  });
}

export async function sendAdminOrderCancelledEmail(order: Order) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `❌ Pedido #${order.id.slice(0, 8).toUpperCase()} cancelado`,
    html:    adminOrderCancelledHtml(order),
  });
}

export async function sendAdminRefundEmail(order: Order, reason: string) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `💳 Reembolso procesado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html:    adminRefundHtml(order, reason),
  });
}

export async function sendAdminOrderStatusEmail(order: Order, oldStatus: string, newStatus: string) {
  return getResendClient().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `📦 Pedido #${order.id.slice(0, 8).toUpperCase()} cambió a "${newStatus}"`,
    html:    adminOrderStatusHtml(order, oldStatus, newStatus),
  });
}