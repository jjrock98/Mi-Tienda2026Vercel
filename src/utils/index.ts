import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  const regexps = [
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /[?&]v=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];
  for (const re of regexps) {
    const match = url.match(re);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

// ============================================================
// ORDER STATUS — incluye 'pendiente_pago' para pagos en efectivo
// ============================================================

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pendiente:       'Pendiente',
  pendiente_pago:  'Esperando pago',   // ← cupón efectivo generado
  pagado:          'Pagado',
  procesando:      'Procesando',
  enviado:         'Enviado',
  entregado:       'Entregado',
  cancelado:       'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pendiente:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pendiente_pago:  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  pagado:          'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400',
  procesando:      'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400',
  enviado:         'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  entregado:       'bg-teal-100   text-teal-800   dark:bg-teal-900/30   dark:text-teal-400',
  cancelado:       'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400',
};

/** Calcula la fecha de vencimiento de un cupón de efectivo (+3 días) */
export function getCashCouponExpiry(createdAt?: string): string {
  const base = createdAt ? new Date(createdAt) : new Date();
  base.setDate(base.getDate() + 3);
  return base.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}
