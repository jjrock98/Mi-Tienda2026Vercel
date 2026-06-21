import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(128),
});

export const registerSchema = loginSchema.extend({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
});

export const resetPasswordSchema   = z.object({ email: z.string().email() });
export const updatePasswordSchema  = z.object({
  password: z.string().min(6).max(128), confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] });

export const profileSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  direccion: z.string().min(5).max(200), ciudad: z.string().min(2).max(100),
  codigo_postal: z.string().min(3).max(10), telefono: z.string().min(7).max(20),
});

export const profileUpdateSchema = z.object({
  nombre:        z.string().min(2).max(100).trim().optional(),
  telefono:      z.string().min(7).max(20).trim().optional(),
  direccion:     z.string().min(5).max(200).trim().optional(),
  ciudad:        z.string().min(2).max(100).trim().optional(),
  codigo_postal: z.string().min(3).max(10).trim().optional(),
});

export const contactMessageSchema = z.object({
  nombre:  z.string().min(2, 'Nombre requerido').max(100).trim(),
  email:   z.string().email('Email inválido').max(255).trim().toLowerCase(),
  asunto:  z.string().max(200).trim().optional(),
  mensaje: z.string().min(10, 'Mínimo 10 caracteres').max(2000).trim(),
});

export const orderItemSchema = z.object({
  product_id:     z.string().uuid('product_id inválido'),
  tipo_pack:      z.enum(['media_docena', 'docena']),
  cantidad_packs: z.number().int().min(1).max(100),
});

// ✅ FIX: tipo_entrega added to checkoutFormSchema
export const checkoutFormSchema = z.object({
  nombre:        z.string().min(2).max(100).trim(),
  email:         z.string().email().max(255).trim().toLowerCase(),
  telefono:      z.string().min(7).max(20).trim(),
  direccion:     z.string().max(200).trim().default(''),
  ciudad:        z.string().max(100).trim().default(''),
  codigo_postal: z.string().max(10).trim().default(''),
  notas:         z.string().max(500).trim().optional(),
  metodo_pago:   z.enum(['mercadopago', 'transferencia']),
  tipo_entrega:  z.enum(['envio', 'retiro']).default('envio'), // ✅ NEW
});

export const createOrderSchema = z.object({
  items:       z.array(orderItemSchema).min(1, 'El carrito está vacío').max(50),
  formData:    checkoutFormSchema,
  subtotal:    z.number().positive().max(9_999_999),
  costo_envio: z.number().min(0).max(99_999),
  total:       z.number().positive().max(9_999_999),
});

export const productSchema = z.object({
  nombre:              z.string().min(2).max(200).trim(),
  slug:                z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  descripcion:         z.string().max(2000).trim().optional().nullable(),
  descripcion_corta:   z.string().max(300).trim().optional().nullable(),
  imagenes:            z.array(z.string().url()).max(10),
  stock_unidades:      z.number().int().min(0).max(100_000),
  precio_media_docena: z.number().min(0).max(9_999_999),
  precio_docena:       z.number().min(0).max(9_999_999),
  colores:             z.array(z.string().max(50)).max(20),
  talles:              z.array(z.string().max(20)).max(20),
  activo:              z.boolean(),
  destacado:           z.boolean(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  estado:  z.enum(['pendiente','pagado','procesando','enviado','entregado','cancelado']),
});

export const shippingZoneSchema = z.object({
  nombre:           z.string().min(2).max(100).trim(),
  codigos_postales: z.array(z.string()).min(1),
  costo:            z.number().min(0).max(999_999),
  dias_entrega:     z.string().max(50).optional().nullable(),
  activo:           z.boolean().default(true),
});

export const uploadComprobanteSchema = z.object({
  orderId: z.string().uuid(), comprobanteUrl: z.string().url(),
});

export function parseBody<T>(
  schema: z.ZodSchema<T>, data: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return { data: null, error: msg };
  }
  return { data: result.data, error: null };
}
