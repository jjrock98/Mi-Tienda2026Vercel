import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'En mantenimiento',
  robots: { index: false },
};

export default async function MantenimientoPage() {
  const supabase = await createClient();

  let mensaje = 'Estamos realizando mejoras. Volvemos pronto.';

  try {
    const { data } = await supabase
      .from('site_settings')
      .select('valor')
      .eq('clave', 'mantenimiento_mensaje')
      .single();

    if (data?.valor) {
      mensaje = data.valor;
    }
  } catch (error) {
    // Si no existe la clave, usamos el mensaje por defecto
    console.error('Error al obtener mensaje de mantenimiento:', error);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-6xl">🔧</div>
      <h1 className="font-display text-3xl font-bold md:text-4xl">Estamos mejorando</h1>
      <p className="text-muted text-lg max-w-md">{mensaje}</p>
      <p className="text-sm text-muted">Disculpá las molestias.</p>
    </div>
  );
}
