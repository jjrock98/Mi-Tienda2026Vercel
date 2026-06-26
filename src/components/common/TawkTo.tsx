'use client';
import { useEffect } from 'react';

export function TawkTo() {
  const propertyId = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID;
  const widgetId   = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID ?? 'default';

  useEffect(() => {
    if (!propertyId) return;

    // 1. Cargar el script de Tawk.to
    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    document.head.appendChild(s1);

    // 2. Agregar estilos para mover el widget a una posición que no tape los botones
    const style = document.createElement('style');
    style.textContent = `
      /* Mover el widget de Tawk.to hacia la derecha y arriba */
      .tawk-min-container {
        bottom: 90px !important;   /* Sube el widget para dejar espacio a los botones */
        right: 10px !important;
        z-index: 99999 !important;
      }

      /* Ajustar el botón circular de chat */
      .tawk-button-circle {
        bottom: 90px !important;
        right: 10px !important;
        z-index: 99999 !important;
      }

      /* Reducir el tamaño del widget en móviles para que ocupe menos espacio */
      @media (max-width: 768px) {
        .tawk-min-container {
          transform: scale(0.8) !important;
          bottom: 80px !important;
          right: 5px !important;
        }
        .tawk-button-circle {
          transform: scale(0.8) !important;
          bottom: 80px !important;
          right: 5px !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(s1)) {
        document.head.removeChild(s1);
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [propertyId, widgetId]);

  return null;
}