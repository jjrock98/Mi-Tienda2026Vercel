import { Resend } from 'resend';
import type { Order } from '@/types';
import {
  orderConfirmationHtml,
  orderStatusHtml,
  contactNotificationHtml,
  cashPaymentPendingHtml,
} from './emails/templates';

const FROM  = `${process.env.RESEND_FROM_NAME ?? 'Mi Tienda'} <${process.env.RESEND_FROM_EMAIL ?? 'noreply@mitienda.com'}>`;
const ADMIN = process.env.RESEND_FROM_EMAIL ?? '';

// ✅ Lazy singleton: NO instanciar Resend a nivel de módulo.
// Si se instancia en el top-level (`const resend = new Resend(...)`),
// Next.js evalúa el módulo durante "Collecting page data" en el build,
// y el constructor de Resend lanza una excepción inmediata si
// RESEND_API_KEY no está disponible en ese momento — esto tumba
// el build completo aunque la variable esté bien configurada en Vercel,
// porque algunos pasos del build corren en un contexto sin acceso
// completo a env vars de runtime.
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY ?? 're_build_placeholder');
  }
  return resendClient;
}

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
