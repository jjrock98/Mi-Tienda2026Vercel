import { createClient } from '@/lib/supabase/server';
import { ContactForm } from '@/components/common/ContactForm';
import { Mail, Phone, Clock, MapPin, Instagram, Facebook } from 'lucide-react';
import type { ContactInfo } from '@/types';

export const metadata = { title: 'Contacto' };
export const revalidate = 300;

export default async function ContactoPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('contact_info').select('*').single();
  const info = data as ContactInfo | null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold mb-10">Contacto</h1>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Info */}
        <div className="space-y-6">
          <p className="text-muted leading-relaxed">
            Estamos para ayudarte. Escribinos y te respondemos a la brevedad.
          </p>
          <div className="space-y-4">
            {info?.email && (
              <a href={`mailto:${info.email}`} className="flex items-center gap-3 text-sm hover:text-brand-600 transition-colors">
                <Mail size={18} className="text-brand-500 shrink-0" />{info.email}
              </a>
            )}
            {info?.telefono && (
              <a href={`tel:${info.telefono}`} className="flex items-center gap-3 text-sm hover:text-brand-600 transition-colors">
                <Phone size={18} className="text-brand-500 shrink-0" />{info.telefono}
              </a>
            )}
            {info?.horario && (
              <div className="flex items-center gap-3 text-sm">
                <Clock size={18} className="text-brand-500 shrink-0" />{info.horario}
              </div>
            )}
            {info?.direccion && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={18} className="text-brand-500 shrink-0" />{info.direccion}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            {info?.instagram && (
              <a href={`https://instagram.com/${info.instagram.replace('@','')}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
                <Instagram size={16} /> Instagram
              </a>
            )}
            {info?.facebook && (
              <a href={info.facebook} target="_blank" rel="noopener noreferrer"
                className="btn-secondary px-4 py-2 text-sm flex items-center gap-2">
                <Facebook size={16} /> Facebook
              </a>
            )}
          </div>
        </div>

        {/* Form */}
        <ContactForm />
      </div>
    </div>
  );
}
