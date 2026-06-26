'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Package, Play } from 'lucide-react';
import { cn } from '@/utils';

interface Props {
  images: string[];
  nombre: string;
  videoUrl?: string; // ✅ nuevo
}

export function ProductPageClient({ images, nombre, videoUrl }: Props) {
  const [current, setCurrent] = useState(0);

  // Construir array de items: imágenes + (opcional) video
  const items = [
    ...images.map((img) => ({ type: 'image' as const, src: img })),
    ...(videoUrl ? [{ type: 'video' as const, src: videoUrl }] : []),
  ];

  if (items.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-surface-2">
        <Package size={64} className="text-muted opacity-30" />
      </div>
    );
  }

  const total = items.length;
  const currentItem = items[current];
  const isVideo = currentItem.type === 'video';

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <div className="space-y-3">
      {/* Main item (imagen o video) */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-2 group">
        {isVideo ? (
          <div className="video-container w-full h-full">
            <iframe
              src={`https://fast.wistia.net/embed/iframe/${currentItem.src}`}
              title={`Video de ${nombre}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <Image
            src={currentItem.src}
            alt={`${nombre} - imagen ${current + 1}`}
            fill
            priority
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        )}

        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 dark:bg-black/60 p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 dark:bg-black/60 p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
              aria-label="Siguiente"
            >
              <ChevronRight size={18} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                  )}
                  aria-label={`Ir a item ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item, i) => {
            const isVideoThumb = item.type === 'video';
            return (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                  i === current
                    ? 'border-brand-500 opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-80'
                )}
              >
                {isVideoThumb ? (
                  <div className="flex h-full w-full items-center justify-center bg-surface-2">
                    <Play size={24} className="text-brand-500" />
                  </div>
                ) : (
                  <Image
                    src={item.src}
                    alt={`${nombre} ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}