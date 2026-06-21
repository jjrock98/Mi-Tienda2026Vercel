import Link from 'next/link';
import { Instagram, Facebook, MessageCircle, Mail, Phone, MapPin } from 'lucide-react';
import type { ContactInfo } from '@/types';

interface FooterProps {
  contactInfo?: ContactInfo | null;
}

export function Footer({ contactInfo }: FooterProps) {
  const year = new Date().getFullYear();
  const tienda = process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? 'Mi Tienda';

  // Extraer datos con fallbacks
  const instagram = contactInfo?.instagram?.replace(/^@/, '') || '';
  const facebook = contactInfo?.facebook || '';
  const whatsapp = contactInfo?.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const email = contactInfo?.email || '';
  const telefono = contactInfo?.telefono || '';
  const direccion = contactInfo?.direccion || '';

  return (
    <footer className="border-t border-border bg-surface-2 mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="font-display text-lg font-bold text-brand-600">{tienda}</p>
            <p className="mt-2 text-sm text-muted">Venta por packs. Calidad garantizada.</p>
          </div>

          {/* Links Tienda */}
          <div>
            <p className="mb-3 text-sm font-semibold">Tienda</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/" className="hover:text-foreground transition-colors">Inicio</Link></li>
              <li><Link href="/carrito" className="hover:text-foreground transition-colors">Carrito</Link></li>
              <li><Link href="/mis-pedidos" className="hover:text-foreground transition-colors">Mis pedidos</Link></li>
              <li><Link href="/wishlist" className="hover:text-foreground transition-colors">Wishlist</Link></li>
            </ul>
          </div>

          {/* Contacto (dinámico) */}
          <div>
            <p className="mb-3 text-sm font-semibold">Contacto</p>
            <ul className="space-y-2 text-sm text-muted">
              {email && (
                <li className="flex items-center gap-2">
                  <Mail size={14} className="shrink-0" />
                  <a href={`mailto:${email}`} className="hover:text-foreground transition-colors">{email}</a>
                </li>
              )}
              {telefono && (
                <li className="flex items-center gap-2">
                  <Phone size={14} className="shrink-0" />
                  <a href={`tel:${telefono}`} className="hover:text-foreground transition-colors">{telefono}</a>
                </li>
              )}
              {direccion && (
                <li className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0" />
                  <span>{direccion}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Redes sociales (dinámico) */}
          <div>
            <p className="mb-4 text-sm font-semibold">Redes sociales</p>
            <div className="flex gap-3">
              {instagram && (
                <a
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 hover:bg-surface transition-colors text-muted hover:text-foreground"
                  aria-label="Instagram"
                >
                  <Instagram size={18} />
                </a>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 hover:bg-surface transition-colors text-muted hover:text-foreground"
                  aria-label="Facebook"
                >
                  <Facebook size={18} />
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 hover:bg-surface transition-colors text-muted hover:text-foreground"
                  aria-label="WhatsApp"
                >
                  <MessageCircle size={18} />
                </a>
              )}
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