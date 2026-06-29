'use client';
import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/utils';

interface InfoTooltipProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoTooltip({ children, className }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex items-center" ref={tooltipRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center justify-center rounded-full p-0.5 text-muted hover:text-foreground transition-colors focus:outline-none',
          className
        )}
        aria-label="Más información"
      >
        <Info size={14} />
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-border text-xs text-foreground animate-fade-in">
          {children}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-zinc-800 border-r border-b border-border rotate-45" />
        </div>
      )}
    </div>
  );
}

// ✅ AGREGADO: export default para evitar problemas de importación en producción
export default InfoTooltip;