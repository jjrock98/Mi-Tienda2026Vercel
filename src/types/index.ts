// ============================================================
// DATABASE TYPES
// ============================================================

export interface Profile {
  id: string; email: string; nombre: string | null; avatar_url: string | null;
  direccion: string | null; ciudad: string | null; codigo_postal: string | null;
  telefono: string | null; rol: 'cliente' | 'admin';
  created_at: string; updated_at: string;
}

export interface Product {
  id: string; nombre: string; slug: string;
  descripcion: string | null; descripcion_corta: string | null;
  imagenes: string[]; stock_unidades: number;
  precio_media_docena: number; precio_docena: number;
  colores: string[]; talles: string[];
  activo: boolean; destacado: boolean;
  video_url: string | null;
  tipo_venta: 'pack' | 'curva';
  unidades_curva: number | null;
  precio_curva: number | null;
  precio_unitario_orientativo: number | null;
  created_at: string; updated_at: string;
}

/**
 * Estados del pedido:
 * pendiente        → Creado, sin pago iniciado
 * pendiente_pago   → Cupón de efectivo generado en MP, esperando pago físico
 * pagado           → Pago confirmado por webhook
 * procesando       → Admin lo está preparando
 * enviado          → En camino al cliente
 * entregado        → Entregado o retirado en local
 * cancelado        → Cancelado (pago rechazado, expirado o manual)
 * reembolsado      → Reembolsado (total o parcial) ✅ NUEVO
 */
export type OrderEstado =
  | 'pendiente'
  | 'pendiente_pago'
  | 'pagado'
  | 'procesando'
  | 'enviado'
  | 'entregado'
  | 'cancelado'
  | 'reembolsado'; // ✅ AGREGADO

export type MetodoPago  = 'mercadopago' | 'transferencia';
export type TipoPack    = 'media_docena' | 'docena';
export type TipoEntrega = 'envio' | 'retiro';

export interface Order {
  id: string;
  user_id: string | null;
  email: string;
  nombre: string;
  telefono: string | null;
  direccion: string;
  ciudad: string;
  codigo_postal: string;
  estado: OrderEstado;
  metodo_pago: MetodoPago;
  tipo_entrega: TipoEntrega;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  mp_status_detail: string | null;
  fecha_pago: string | null;
  comprobante_url: string | null;
  comprobante_revisado: boolean;
  rejection_reason: string | null;
  subtotal: number;
  costo_envio: number;
  total: number;
  notas: string | null;
  stock_descontado: boolean;
  created_at: string;
  updated_at: string;
  codigo_retiro?: string | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string; order_id: string; product_id: string;
  tipo_pack: TipoPack | null;
  tipo_venta: 'pack' | 'curva';
  unidades_por_item: number;
  cantidad_items: number;
  unidades: number;
  precio_unit: number;
  subtotal: number;
  nombre_snap: string; imagen_snap: string | null;
  products?: Product;
}

export interface WishlistItem {
  id: string; user_id: string; product_id: string;
  created_at: string; products?: Product;
}

export interface ShippingZone {
  id: string; nombre: string; codigos_postales: string[];
  costo: number; dias_entrega: string | null;
  activo: boolean; created_at: string; updated_at: string;
}

export interface ContactMessage {
  id: string; nombre: string; email: string;
  asunto: string | null; mensaje: string;
  leido: boolean; created_at: string;
}

export interface ContactInfo {
  id: string; email: string | null; telefono: string | null;
  whatsapp: string | null; instagram: string | null;
  facebook: string | null; horario: string | null;
  direccion: string | null; updated_at: string;
}

export interface LocationInfo {
  id: string; mapa_iframe_url: string | null; descripcion: string | null;
  video1_url: string | null; video1_titulo: string | null;
  video2_url: string | null; video2_titulo: string | null;
  updated_at: string;
}

export interface BankInfo {
  id: string; titular: string | null; cbu: string | null;
  alias: string | null; banco: string | null;
  tipo_cuenta: string | null; cuit: string | null;
  instrucciones: string | null; updated_at: string;
}

export interface SiteSetting {
  id: string; clave: string; valor: string | null;
  descripcion: string | null; updated_at: string;
}

// ============================================================
// CART TYPES
// ============================================================

export interface CartItem {
  productId: string; productSlug: string;
  nombre: string; imagen: string;
  tipoVenta: 'pack' | 'curva';
  tipoPack?: TipoPack;
  unidadesPorItem: number;
  cantidadItems: number;
  unidades: number;
  precioUnitario: number;
  subtotal: number;
}

// ============================================================
// CHECKOUT TYPES
// ============================================================

export interface CheckoutFormData {
  nombre: string; email: string; telefono: string;
  direccion: string; ciudad: string; codigo_postal: string;
  notas?: string; metodo_pago: MetodoPago; tipo_entrega: TipoEntrega;
}

export interface CreateOrderPayload {
  items: {
    product_id: string;
    tipo_venta: 'pack' | 'curva';
    tipo_pack?: TipoPack;
    unidades_por_item: number;
    cantidad_items: number;
    precio_unit: number;
  }[];
  formData: CheckoutFormData;
  subtotal: number; costo_envio: number; total: number;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  data?: T; error?: string; message?: string;
}

export interface MPPreferenceResponse {
  preferenceId: string; initPoint: string; sandboxInitPoint: string;
}

// ============================================================
// PACK CONFIG
// ============================================================

export const PACK_CONFIG: Record<TipoPack, { label: string; unidades: number }> = {
  media_docena: { label: 'Media Docena (6)', unidades: 6  },
  docena:       { label: 'Docena (12)',       unidades: 12 },
};

// ============================================================
// MP PAYMENT STATUS
// ============================================================

export type MPPaymentStatus = 'approved' | 'pending' | 'rejected' | 'cancelled' | null;

export const MP_CASH_STATUS_DETAILS = [
  'waiting_for_payment',
  'pending_waiting_payment',
] as const;