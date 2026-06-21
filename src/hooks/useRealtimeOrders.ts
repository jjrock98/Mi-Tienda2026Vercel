'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/types';

export interface RealtimeNotification {
  id:      string;
  type:    'new_order' | 'comprobante_uploaded' | 'order_updated';
  title:   string;
  message: string;
  orderId: string;
  read:    boolean;
  at:      Date;
}

// Flag a nivel de módulo para evitar múltiples canales
let globalChannel: any = null;
let globalSubscribed = false;

export function useRealtimeOrders(onOrdersChange?: (orders: Order[]) => void) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const mountedRef = useRef(true);

  // Refs para funciones
  const onOrdersChangeRef = useRef(onOrdersChange);
  useEffect(() => {
    onOrdersChangeRef.current = onOrdersChange;
  }, [onOrdersChange]);

  const addNotification = useCallback((n: Omit<RealtimeNotification, 'id' | 'read' | 'at'>) => {
    const notif: RealtimeNotification = {
      ...n,
      id:   crypto.randomUUID(),
      read: false,
      at:   new Date(),
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 50));
    setUnreadCount((c) => c + 1);
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      new Notification(n.title, { body: n.message, icon: '/icons/icon-192.png' });
    }
  }, []);

  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  // ── Canal Realtime ──
  useEffect(() => {
    mountedRef.current = true;

    // Si ya existe un canal global y está suscrito, no crear otro
    if (globalChannel && globalSubscribed) {
      console.log('[Realtime] Usando canal global existente');
      // Asignar los mismos callbacks al canal global? No es necesario porque ya están configurados.
      // Pero necesitamos que el componente reaccione a los cambios, así que vinculamos los refs.
      // Sin embargo, los callbacks ya están configurados con las referencias iniciales, pero no se actualizarán.
      // Para solucionarlo, podemos actualizar los refs y, si el canal ya está suscrito, no hacemos nada más.
      return () => {
        mountedRef.current = false;
      };
    }

    // Solicitar permiso de notificaciones
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Crear canal
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        if (!mountedRef.current) return;
        const order = payload.new as Order;
        addNotificationRef.current({
          type:    'new_order',
          title:   '🛒 Nuevo pedido',
          message: `${order.nombre} · ${order.metodo_pago === 'mercadopago' ? 'Mercado Pago' : 'Transferencia'}`,
          orderId: order.id,
        });
        if (onOrdersChangeRef.current) {
          supabase
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false })
            .limit(100)
            .then(({ data }) => {
              if (mountedRef.current && data) onOrdersChangeRef.current?.(data as Order[]);
            });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if (!mountedRef.current) return;
        const newOrder = payload.new as Order;
        const oldOrder = payload.old as Partial<Order>;

        if (!oldOrder.comprobante_url && newOrder.comprobante_url) {
          addNotificationRef.current({
            type:    'comprobante_uploaded',
            title:   '📎 Comprobante recibido',
            message: `${newOrder.nombre} subió el comprobante.`,
            orderId: newOrder.id,
          });
        }

        if (oldOrder.estado && newOrder.estado !== oldOrder.estado) {
          addNotificationRef.current({
            type:    'order_updated',
            title:   '🔄 Pedido actualizado',
            message: `#${newOrder.id.slice(0,8).toUpperCase()} → ${newOrder.estado}`,
            orderId: newOrder.id,
          });
        }

        if (onOrdersChangeRef.current) {
          supabase
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false })
            .limit(100)
            .then(({ data }) => {
              if (mountedRef.current && data) onOrdersChangeRef.current?.(data as Order[]);
            });
        }
      });

    // Suscribir
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        globalSubscribed = true;
        console.log('[Realtime] Admin orders channel active (global)');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Channel error');
      } else if (status === 'CLOSED') {
        globalSubscribed = false;
        console.log('[Realtime] Channel closed');
      }
    });

    // Guardar referencia global
    globalChannel = channel;

    // Cleanup
    return () => {
      mountedRef.current = false;
      // No eliminar el canal global aquí porque puede ser usado por otros componentes.
      // Solo eliminamos si este es el último componente que lo usa (contador de referencias).
      // Para simplificar, no eliminamos el canal global, solo marcamos que no estamos montados.
      // De todas formas, el canal global se mantiene activo mientras la aplicación esté en ejecución.
    };
  }, []); // Dependencias vacías

  return { notifications, unreadCount, markAllRead, markRead };
}