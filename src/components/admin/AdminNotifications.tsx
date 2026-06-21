'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Bell, ShoppingBag, FileCheck, RefreshCw, CheckCheck, X } from 'lucide-react';
import { useRealtimeOrders, type RealtimeNotification } from '@/hooks/useRealtimeOrders';
import { cn } from '@/utils';

const NOTIF_ICONS: Record<RealtimeNotification['type'], React.ReactNode> = {
  new_order:           <ShoppingBag size={15} className="text-brand-500" />,
  comprobante_uploaded:<FileCheck   size={15} className="text-green-500" />,
  order_updated:       <RefreshCw   size={15} className="text-blue-500"  />,
};

function formatRelative(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)   return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `hace ${Math.floor(diff / 3600)}h`;
  return date.toLocaleDateString('es-AR');
}

export function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, markRead } = useRealtimeOrders();

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}
        className="relative btn-ghost p-2 text-muted hover:text-foreground"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-border bg-surface shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-semibold text-sm">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button onClick={markAllRead} className="text-xs text-muted hover:text-brand-600 flex items-center gap-1">
                    <CheckCheck size={12} /> Marcar todo leído
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted">
                  <Bell size={32} className="opacity-20" />
                  <p className="text-xs">Sin notificaciones</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={`/admin/pedidos`}
                    onClick={() => { markRead(n.id); setOpen(false); }}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2 border-b border-border last:border-0',
                      !n.read && 'bg-brand-50/50 dark:bg-brand-950/10'
                    )}
                  >
                    <span className="mt-0.5 shrink-0">{NOTIF_ICONS[n.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-medium text-xs', !n.read && 'text-foreground')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted line-clamp-2 mt-0.5">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-muted shrink-0 mt-0.5">
                      {formatRelative(n.at)}
                    </span>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                  </Link>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-border p-2">
                <Link
                  href="/admin/pedidos"
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs text-brand-600 hover:underline py-1"
                >
                  Ver todos los pedidos →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
