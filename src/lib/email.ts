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
const ADMIN = process.env.ADMIN_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? '';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    console.log('📧 Inicializando cliente Resend con API Key:', process.env.RESEND_API_KEY ? '✅ presente' : '❌ FALTA');
    resendClient = new Resend(process.env.RESEND_API_KEY ?? 're_build_placeholder');
  }
  return resendClient;
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(order: Order) {
  console.log(`📤 Enviando confirmación de pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `Pedido #${order.id.slice(0, 8).toUpperCase()} confirmado ✓`,
      html:    orderConfirmationHtml(order),
    });
    console.log(`✅ Confirmación enviada a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendOrderConfirmationEmail para ${order.email}:`, error);
    throw error;
  }
}

export async function sendOrderStatusEmail(order: Order) {
  console.log(`📤 Enviando actualización de estado (${order.estado}) a ${order.email}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `Tu pedido está ${order.estado} – ${process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda'}`,
      html:    orderStatusHtml(order),
    });
    console.log(`✅ Estado enviado a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendOrderStatusEmail para ${order.email}:`, error);
    throw error;
  }
}

export async function sendContactMessageEmail(
  nombre: string, email: string, asunto: string, mensaje: string
) {
  console.log(`📤 Enviando mensaje de contacto de ${nombre} (${email}) al admin (${ADMIN})`);
  try {
    const result = await getResendClient().emails.send({
      from:     FROM,
      to:       ADMIN,
      reply_to: email,
      subject:  `Nuevo contacto: ${asunto || nombre}`,
      html:     contactNotificationHtml(nombre, email, asunto, mensaje),
    });
    console.log(`✅ Contacto enviado al admin`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendContactMessageEmail:`, error);
    throw error;
  }
}

export async function sendCashPaymentPendingEmail(order: Order) {
  console.log(`📤 Enviando cupón de efectivo para pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `🧾 Tu cupón de pago fue generado — Pedido #${order.id.slice(0, 8).toUpperCase()}`,
      html:    cashPaymentPendingHtml(order),
    });
    console.log(`✅ Cupón enviado a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendCashPaymentPendingEmail:`, error);
    throw error;
  }
}

export async function sendPaymentConfirmedEmail(order: Order) {
  console.log(`📤 Enviando confirmación de pago para pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `💰 Pago confirmado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
      html:    paymentConfirmedHtml(order),
    });
    console.log(`✅ Pago confirmado enviado a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendPaymentConfirmedEmail:`, error);
    throw error;
  }
}

export async function sendOrderProcessingEmail(order: Order) {
  console.log(`📤 Enviando estado "procesando" para pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `📦 Tu pedido #${order.id.slice(0, 8).toUpperCase()} está en preparación`,
      html:    orderProcessingHtml(order),
    });
    console.log(`✅ "Procesando" enviado a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendOrderProcessingEmail:`, error);
    throw error;
  }
}

export async function sendOrderShippedEmail(order: Order, trackingNumber?: string) {
  console.log(`📤 Enviando estado "enviado" para pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email}${trackingNumber ? ` (tracking: ${trackingNumber})` : ''}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `🚚 Tu pedido #${order.id.slice(0, 8).toUpperCase()} fue enviado`,
      html:    orderShippedHtml(order, trackingNumber),
    });
    console.log(`✅ "Enviado" enviado a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendOrderShippedEmail:`, error);
    throw error;
  }
}

export async function sendOrderDeliveredEmail(order: Order) {
  console.log(`📤 Enviando estado "entregado" para pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `📬 Pedido #${order.id.slice(0, 8).toUpperCase()} entregado`,
      html:    orderDeliveredHtml(order),
    });
    console.log(`✅ "Entregado" enviado a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendOrderDeliveredEmail:`, error);
    throw error;
  }
}

export async function sendOrderCancelledEmail(order: Order) {
  console.log(`📤 Enviando cancelación para pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `❌ Pedido #${order.id.slice(0, 8).toUpperCase()} cancelado`,
      html:    orderCancelledHtml(order),
    });
    console.log(`✅ Cancelación enviada a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendOrderCancelledEmail:`, error);
    throw error;
  }
}

export async function sendRefundEmail(order: Order, reason: string) {
  console.log(`📤 Enviando reembolso para pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email} (motivo: ${reason})`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `💳 Reembolso procesado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
      html:    refundHtml(order, reason),
    });
    console.log(`✅ Reembolso enviado a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendRefundEmail:`, error);
    throw error;
  }
}

export async function sendPaymentReminderEmail(order: Order) {
  console.log(`📤 Enviando recordatorio de pago para pedido #${order.id.slice(0,8).toUpperCase()} a ${order.email}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      order.email,
      subject: `⏳ Recordatorio de pago – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
      html:    paymentReminderHtml(order),
    });
    console.log(`✅ Recordatorio enviado a ${order.email}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en sendPaymentReminderEmail:`, error);
    throw error;
  }
}

// ─── Administrador ────────────────────────────────────────────────────────────

export async function sendAdminNewOrderEmail(order: Order) {
  console.log(`📤 [ADMIN] Enviando notificación de NUEVO PEDIDO #${order.id.slice(0,8).toUpperCase()} a ${ADMIN}`);
  console.log(`   Cliente: ${order.nombre} (${order.email}), Total: ${order.total}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      ADMIN,
      subject: `📦 Nuevo pedido #${order.id.slice(0, 8).toUpperCase()} recibido`,
      html:    adminNewOrderHtml(order),
    });
    console.log(`✅ [ADMIN] Nuevo pedido notificado a ${ADMIN}`, result);
    return result;
  } catch (error) {
    console.error(`❌ [ADMIN] Error en sendAdminNewOrderEmail:`, error);
    throw error;
  }
}

export async function sendAdminPaymentConfirmedEmail(order: Order) {
  console.log(`📤 [ADMIN] Enviando notificación de PAGO CONFIRMADO #${order.id.slice(0,8).toUpperCase()} a ${ADMIN}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      ADMIN,
      subject: `💰 Pago confirmado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
      html:    adminPaymentConfirmedHtml(order),
    });
    console.log(`✅ [ADMIN] Pago confirmado notificado a ${ADMIN}`, result);
    return result;
  } catch (error) {
    console.error(`❌ [ADMIN] Error en sendAdminPaymentConfirmedEmail:`, error);
    throw error;
  }
}

export async function sendAdminOrderCancelledEmail(order: Order) {
  console.log(`📤 [ADMIN] Enviando notificación de CANCELACIÓN #${order.id.slice(0,8).toUpperCase()} a ${ADMIN}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      ADMIN,
      subject: `❌ Pedido #${order.id.slice(0, 8).toUpperCase()} cancelado`,
      html:    adminOrderCancelledHtml(order),
    });
    console.log(`✅ [ADMIN] Cancelación notificada a ${ADMIN}`, result);
    return result;
  } catch (error) {
    console.error(`❌ [ADMIN] Error en sendAdminOrderCancelledEmail:`, error);
    throw error;
  }
}

export async function sendAdminRefundEmail(order: Order, reason: string) {
  console.log(`📤 [ADMIN] Enviando notificación de REEMBOLSO #${order.id.slice(0,8).toUpperCase()} a ${ADMIN} (motivo: ${reason})`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      ADMIN,
      subject: `💳 Reembolso procesado – Pedido #${order.id.slice(0, 8).toUpperCase()}`,
      html:    adminRefundHtml(order, reason),
    });
    console.log(`✅ [ADMIN] Reembolso notificado a ${ADMIN}`, result);
    return result;
  } catch (error) {
    console.error(`❌ [ADMIN] Error en sendAdminRefundEmail:`, error);
    throw error;
  }
}

export async function sendAdminOrderStatusEmail(order: Order, oldStatus: string, newStatus: string) {
  console.log(`📤 [ADMIN] Enviando notificación de CAMBIO DE ESTADO #${order.id.slice(0,8).toUpperCase()} a ${ADMIN}`);
  console.log(`   Estado anterior: ${oldStatus}, Nuevo estado: ${newStatus}`);
  try {
    const result = await getResendClient().emails.send({
      from:    FROM,
      to:      ADMIN,
      subject: `📦 Pedido #${order.id.slice(0, 8).toUpperCase()} cambió a "${newStatus}"`,
      html:    adminOrderStatusHtml(order, oldStatus, newStatus),
    });
    console.log(`✅ [ADMIN] Cambio de estado notificado a ${ADMIN}`, result);
    return result;
  } catch (error) {
    console.error(`❌ [ADMIN] Error en sendAdminOrderStatusEmail:`, error);
    throw error;
  }
}