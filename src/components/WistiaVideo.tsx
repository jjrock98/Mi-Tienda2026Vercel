'use client';

import { WistiaPlayer } from '@wistia/wistia-player-react';

interface WistiaVideoProps {
  mediaId: string; // El ID del video en Wistia (ej: "tbcgph3pe9")
  title?: string;
  className?: string;
}

export function WistiaVideo({ mediaId, title, className = '' }: WistiaVideoProps) {
  if (!mediaId) return null;

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <WistiaPlayer
        mediaId={mediaId}
        // ✅ Props corregidas según la API oficial de Wistia
        autoplay={false}              // No reproduce automáticamente
        fullscreenControl={false}     // Oculta el botón de pantalla completa
        muted={false}                 // No silenciado
        controlsVisibleOnLoad={true}  // Muestra los controles al cargar
        // Otras opciones útiles:
        // playButton={true}
        // volumeControl={true}
        // settingsControl={false}
        // captions={false}
        // qualityControl={false}
        // playerColor="#4F46E5" // Color del reproductor
        // endVideoBehavior="default" // 'default' | 'reset' | 'loop'
      />
    </div>
  );
}