import { createClient } from '@/lib/supabase/server';
import { MapPin } from 'lucide-react';
import type { LocationInfo } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ubicación' };
export const revalidate = 300;

export default async function UbicacionPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('location_info').select('*').single();
  const info = data as LocationInfo | null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-14">
      <div>
        <h1 className="font-display text-4xl font-bold mb-2 flex items-center gap-3">
          <MapPin className="text-brand-500" /> Ubicación
        </h1>
        {info?.descripcion && (
          <p className="text-muted text-lg max-w-2xl leading-relaxed">{info.descripcion}</p>
        )}
      </div>

      {/* Mapa */}
      {info?.mapa_iframe_url && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Cómo llegar</h2>
          <div className="video-container shadow-lg">
            <iframe
              src={info.mapa_iframe_url}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa de ubicación"
            />
          </div>
        </section>
      )}

      {/* ✅ Videos con iframe de Wistia */}
      {(info?.video1_url || info?.video2_url) && (
        <section>
          <h2 className="text-xl font-semibold mb-6">Videos del lugar</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {info?.video1_url && (
              <div>
                {info.video1_titulo && <h3 className="font-medium mb-3">{info.video1_titulo}</h3>}
                <div className="video-container shadow-md">
                  <iframe
                    src={`https://fast.wistia.net/embed/iframe/${info.video1_url}`}
                    title={info.video1_titulo ?? 'Video 1'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
            {info?.video2_url && (
              <div>
                {info.video2_titulo && <h3 className="font-medium mb-3">{info.video2_titulo}</h3>}
                <div className="video-container shadow-md">
                  <iframe
                    src={`https://fast.wistia.net/embed/iframe/${info.video2_url}`}
                    title={info.video2_titulo ?? 'Video 2'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}