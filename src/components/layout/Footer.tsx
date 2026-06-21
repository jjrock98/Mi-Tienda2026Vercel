import Link from 'next/link';
import { Instagram, Facebook, MessageCircle } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();
  const tienda = process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda';

  return (
    <footer className="border-t border-border bg-surface-2 mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="font-display text-lg font-bold text-brand-600">{tienda}</p>
            <p className="mt-2 text-sm text-muted">Venta por packs. Calidad garantizada.</p>
          </div>

          {/* Links */}
          <div>
            <p className="mb-3 text-sm font-semibold">Tienda</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/" className="hover:text-foreground transition-colors">Inicio</Link></li>
              <li><Link href="/carrito" className="hover:text-foreground transition-colors">Carrito</Link></li>
              <li><Link href="/mis-pedidos" className="hover:text-foreground transition-colors">Mis pedidos</Link></li>
              <li><Link href="/wishlist" className="hover:text-foreground transition-colors">Wishlist</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <p className="mb-3 text-sm font-semibold">Información</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/faq"       className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/politicas" className="hover:text-foreground transition-colors">Políticas de privacidad</Link></li>
              <li><Link href="/terminos"  className="hover:text-foreground transition-colors">Términos y condiciones</Link></li>
              <li><Link href="/contacto"  className="hover:text-foreground transition-colors">Contacto</Link></li>
              <li><Link href="/ubicacion" className="hover:text-foreground transition-colors">Ubicación</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="mb-3 text-sm font-semibold">Redes sociales</p>
            <div className="flex gap-3">
              <a href="#" className="rounded-lg p-2 hover:bg-surface transition-colors text-muted hover:text-foreground" aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="#" className="rounded-lg p-2 hover:bg-surface transition-colors text-muted hover:text-foreground" aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
                className="rounded-lg p-2 hover:bg-surface transition-colors text-muted hover:text-foreground"
                target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted">
          © {year} {tienda}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
