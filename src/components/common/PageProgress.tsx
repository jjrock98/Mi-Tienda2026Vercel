'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ProgressBar() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(false);
  
  // Ref para controlar el montaje
  const isMounted = useRef(true);
  const timers    = useRef<NodeJS.Timeout[]>([]);

  // Limpiar todos los timeouts
  const clearAllTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    isMounted.current = true;
    clearAllTimers();

    // Iniciar barra de progreso solo si el componente está montado
    if (!isMounted.current) return;
    setVisible(true);
    setProgress(15);

    // Programar los incrementos
    const t1 = setTimeout(() => {
      if (isMounted.current) setProgress(40);
    }, 150);
    const t2 = setTimeout(() => {
      if (isMounted.current) setProgress(65);
    }, 400);
    const t3 = setTimeout(() => {
      if (isMounted.current) setProgress(85);
    }, 700);
    const t4 = setTimeout(() => {
      if (isMounted.current) {
        setProgress(100);
        const t5 = setTimeout(() => {
          if (isMounted.current) setVisible(false);
        }, 300);
        timers.current.push(t5);
      }
    }, 1000);

    timers.current.push(t1, t2, t3, t4);

    // Cleanup al desmontar o al cambiar la ruta
    return () => {
      isMounted.current = false;
      clearAllTimers();
    };
  }, [pathname, searchParams]);

  // No renderizar si no está visible o si el componente se está desmontando
  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-0.5 bg-brand-500 transition-all duration-300 ease-out shadow-sm shadow-brand-400"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
        transition: progress === 100
          ? 'width 200ms ease, opacity 300ms ease 200ms'
          : 'width 400ms ease',
      }}
    />
  );
}

export function PageProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}