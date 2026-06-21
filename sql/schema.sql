-- ============================================================
-- ECOMMERCE SCHEMA - Supabase PostgreSQL
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extended from auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  nombre        TEXT,
  avatar_url    TEXT,
  direccion     TEXT,
  ciudad        TEXT,
  codigo_postal TEXT,
  telefono      TEXT,
  rol           TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre               TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  descripcion          TEXT,
  descripcion_corta    TEXT,
  imagenes             TEXT[] NOT NULL DEFAULT '{}',
  stock_unidades       INT NOT NULL DEFAULT 0 CHECK (stock_unidades >= 0),
  precio_media_docena  NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_docena        NUMERIC(10,2) NOT NULL DEFAULT 0,
  colores              TEXT[] DEFAULT '{}',
  talles               TEXT[] DEFAULT '{}',
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  destacado            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);
CREATE INDEX IF NOT EXISTS products_activo_idx ON products(activo);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email                TEXT NOT NULL,
  nombre               TEXT NOT NULL,
  telefono             TEXT,
  direccion            TEXT NOT NULL,
  ciudad               TEXT NOT NULL,
  codigo_postal        TEXT NOT NULL,
  estado               TEXT NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente','pagado','procesando','enviado','entregado','cancelado')),
  metodo_pago          TEXT NOT NULL CHECK (metodo_pago IN ('mercadopago','stripe','transferencia')),
  mp_preference_id     TEXT,
  mp_payment_id        TEXT,
  stripe_session_id    TEXT,
  stripe_payment_id    TEXT,
  comprobante_url      TEXT,
  subtotal             NUMERIC(10,2) NOT NULL DEFAULT 0,
  costo_envio          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                NUMERIC(10,2) NOT NULL DEFAULT 0,
  notas                TEXT,
  stock_descontado     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_estado_idx ON orders(estado);
CREATE INDEX IF NOT EXISTS orders_mp_payment_id_idx ON orders(mp_payment_id);
CREATE INDEX IF NOT EXISTS orders_stripe_session_id_idx ON orders(stripe_session_id);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  tipo_pack     TEXT NOT NULL CHECK (tipo_pack IN ('media_docena','docena')),
  cantidad_packs INT NOT NULL CHECK (cantidad_packs > 0),
  unidades      INT NOT NULL CHECK (unidades > 0),
  precio_unit   NUMERIC(10,2) NOT NULL,
  subtotal      NUMERIC(10,2) NOT NULL,
  nombre_snap   TEXT NOT NULL,
  imagen_snap   TEXT
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

-- Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS wishlists_user_id_idx ON wishlists(user_id);

-- Shipping zones
CREATE TABLE IF NOT EXISTS shipping_zones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  codigos_postales TEXT[] NOT NULL DEFAULT '{}',
  costo         NUMERIC(10,2) NOT NULL DEFAULT 0,
  dias_entrega  TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre     TEXT NOT NULL,
  email      TEXT NOT NULL,
  asunto     TEXT,
  mensaje    TEXT NOT NULL,
  leido      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact info (single row)
CREATE TABLE IF NOT EXISTS contact_info (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT,
  telefono   TEXT,
  whatsapp   TEXT,
  instagram  TEXT,
  facebook   TEXT,
  horario    TEXT,
  direccion  TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Location info (single row)
CREATE TABLE IF NOT EXISTS location_info (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mapa_iframe_url TEXT,
  descripcion     TEXT,
  video1_url      TEXT,
  video1_titulo   TEXT,
  video2_url      TEXT,
  video2_titulo   TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank info (single row)
CREATE TABLE IF NOT EXISTS bank_info (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titular         TEXT,
  cbu             TEXT,
  alias           TEXT,
  banco           TEXT,
  tipo_cuenta     TEXT,
  cuit            TEXT,
  instrucciones   TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site settings (key-value)
CREATE TABLE IF NOT EXISTS site_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave       TEXT NOT NULL UNIQUE,
  valor       TEXT,
  descripcion TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INITIAL DATA
-- ============================================================

INSERT INTO site_settings (clave, valor, descripcion)
VALUES
  ('mantenimiento', 'false', 'Modo mantenimiento activo/inactivo'),
  ('mantenimiento_mensaje', 'Estamos realizando mejoras. Volvemos pronto.', 'Mensaje de mantenimiento'),
  ('nombre_tienda', 'Mi Tienda', 'Nombre de la tienda'),
  ('descripcion_tienda', 'La mejor tienda online', 'Descripción SEO de la tienda')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO contact_info (email, telefono, whatsapp, horario)
VALUES ('clarosjavier1998@gmail.com', '+54 11 66585257', '5491166585257', 'Lunes, Miércoles y Viernes 7-13hs')
ON CONFLICT DO NOTHING;

INSERT INTO location_info (mapa_iframe_url, descripcion)
VALUES ('https://www.google.com/maps/embed?...', 'Visitanos en nuestra tienda física.')
ON CONFLICT DO NOTHING;

INSERT INTO bank_info (titular, banco, tipo_cuenta)
VALUES ('Mi Tienda S.A.', 'Banco Nación', 'Cuenta Corriente')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FUNCIÓN: descontar_stock_seguro (con lock)
-- ============================================================
CREATE OR REPLACE FUNCTION descontar_stock_seguro(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order         orders%ROWTYPE;
  v_item          order_items%ROWTYPE;
  v_product       products%ROWTYPE;
  v_errors        TEXT[] := '{}';
BEGIN
  -- Obtener el pedido con lock
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF v_order.stock_descontado THEN
    RETURN jsonb_build_object('success', true, 'message', 'Stock ya descontado');
  END IF;

  -- Verificar disponibilidad de stock primero
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    SELECT * INTO v_product FROM products WHERE id = v_item.product_id FOR UPDATE;
    IF NOT FOUND THEN
      v_errors := array_append(v_errors, 'Producto no encontrado: ' || v_item.product_id::TEXT);
    ELSIF v_product.stock_unidades < v_item.unidades THEN
      v_errors := array_append(v_errors, 
        'Stock insuficiente para "' || v_product.nombre || '": disponible=' || 
        v_product.stock_unidades::TEXT || ', requerido=' || v_item.unidades::TEXT
      );
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RETURN jsonb_build_object('success', false, 'errors', to_jsonb(v_errors));
  END IF;

  -- Descontar stock
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    UPDATE products
    SET stock_unidades = stock_unidades - v_item.unidades,
        updated_at = NOW()
    WHERE id = v_item.product_id;
  END LOOP;

  -- Marcar como descontado y actualizar estado
  UPDATE orders
  SET stock_descontado = TRUE,
      estado = 'pagado',
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'message', 'Stock descontado correctamente');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, nombre, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    nombre     = COALESCE(profiles.nombre, EXCLUDED.nombre),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_orders   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_info     ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_info    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_info        ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings    ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'
  );
$$;

-- profiles
CREATE POLICY "profiles_select_own"    ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_update_own"    ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_insert_own"    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- products (public read, admin write)
CREATE POLICY "products_public_read"   ON products FOR SELECT USING (activo = TRUE OR is_admin());
CREATE POLICY "products_admin_insert"  ON products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "products_admin_update"  ON products FOR UPDATE USING (is_admin());
CREATE POLICY "products_admin_delete"  ON products FOR DELETE USING (is_admin());

-- orders
CREATE POLICY "orders_select"          ON orders FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "orders_insert_auth"     ON orders FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL);
CREATE POLICY "orders_update_admin"    ON orders FOR UPDATE USING (is_admin());

-- order_items
CREATE POLICY "order_items_select"     ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR is_admin()))
);
CREATE POLICY "order_items_insert"     ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- wishlists
CREATE POLICY "wishlists_own"          ON wishlists FOR ALL USING (user_id = auth.uid());

-- shipping_zones (public read, admin write)
CREATE POLICY "shipping_zones_read"    ON shipping_zones FOR SELECT USING (activo = TRUE OR is_admin());
CREATE POLICY "shipping_zones_admin"   ON shipping_zones FOR ALL USING (is_admin());

-- contact_messages (insert public, read admin)
CREATE POLICY "contact_messages_insert" ON contact_messages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "contact_messages_admin"  ON contact_messages FOR SELECT USING (is_admin());
CREATE POLICY "contact_messages_update" ON contact_messages FOR UPDATE USING (is_admin());

-- contact_info, location_info, bank_info (read public, write admin)
CREATE POLICY "contact_info_read"      ON contact_info    FOR SELECT USING (TRUE);
CREATE POLICY "contact_info_admin"     ON contact_info    FOR ALL    USING (is_admin());
CREATE POLICY "location_info_read"     ON location_info   FOR SELECT USING (TRUE);
CREATE POLICY "location_info_admin"    ON location_info   FOR ALL    USING (is_admin());
CREATE POLICY "bank_info_read"         ON bank_info       FOR SELECT USING (TRUE);
CREATE POLICY "bank_info_admin"        ON bank_info       FOR ALL    USING (is_admin());

-- site_settings (read public, write admin)
CREATE POLICY "site_settings_read"     ON site_settings   FOR SELECT USING (TRUE);
CREATE POLICY "site_settings_admin"    ON site_settings   FOR ALL    USING (is_admin());

-- Storage bucket for product images and receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('products',    'products',    TRUE,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('comprobantes','comprobantes',FALSE, 10485760, ARRAY['image/jpeg','image/png','image/pdf','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "products_public_read"     ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "products_admin_upload"    ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND is_admin());
CREATE POLICY "products_admin_delete"    ON storage.objects FOR DELETE USING (bucket_id = 'products' AND is_admin());
CREATE POLICY "comprobantes_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comprobantes' AND auth.uid() IS NOT NULL);
CREATE POLICY "comprobantes_own_read"    ON storage.objects FOR SELECT USING (bucket_id = 'comprobantes' AND (auth.uid()::TEXT = (storage.foldername(name))[1] OR is_admin()));

-- ============================================================
-- MIGRATION: Add rejection_reason to orders
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_revisado BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN orders.rejection_reason IS 'Motivo de rechazo del comprobante por parte del admin';
COMMENT ON COLUMN orders.comprobante_revisado IS 'True cuando el admin revisó el comprobante (aprobado o rechazado)';

-- Migration: add tipo_entrega to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tipo_entrega TEXT NOT NULL DEFAULT 'envio'
    CHECK (tipo_entrega IN ('envio', 'retiro'));

COMMENT ON COLUMN orders.tipo_entrega IS 'envio = entrega a domicilio, retiro = retiro en local';

-- ============================================================
-- MIGRATION: Cash payment support (efectivo MP)
-- ============================================================

-- New columns for MP payment tracking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fecha_pago       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mp_status_detail TEXT;

COMMENT ON COLUMN orders.fecha_pago       IS 'Fecha en que el pago fue confirmado por MP';
COMMENT ON COLUMN orders.mp_status_detail IS 'status_detail de MP: waiting_for_payment, accredited, etc.';

-- Update estado CHECK constraint to include 'pendiente_pago'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_estado_check;
ALTER TABLE orders ADD CONSTRAINT orders_estado_check
  CHECK (estado IN (
    'pendiente',       -- Pedido creado, aún no inició pago
    'pendiente_pago',  -- Cupón de efectivo generado, esperando pago físico
    'pagado',          -- Pago confirmado (webhook approved)
    'procesando',      -- Admin lo está preparando
    'enviado',         -- En camino
    'entregado',       -- Entregado/retirado
    'cancelado'        -- Cancelado por cualquier motivo
  ));

-- ============================================================
-- FUNCIÓN: devolver_stock_seguro (restaurar stock en rechazos)
-- ============================================================
CREATE OR REPLACE FUNCTION devolver_stock_seguro(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order  orders%ROWTYPE;
  v_item   order_items%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;

  IF NOT v_order.stock_descontado THEN
    RETURN jsonb_build_object('success', true, 'message', 'Stock no había sido descontado');
  END IF;

  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    UPDATE products
      SET stock_unidades = stock_unidades + v_item.unidades,
          updated_at     = NOW()
      WHERE id = v_item.product_id;
  END LOOP;

  UPDATE orders
    SET stock_descontado = FALSE,
        updated_at       = NOW()
    WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'message', 'Stock restaurado correctamente');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RLS: admin can call both stock functions
GRANT EXECUTE ON FUNCTION descontar_stock_seguro(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION devolver_stock_seguro(UUID)  TO service_role;
