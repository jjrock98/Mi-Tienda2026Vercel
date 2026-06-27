import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, TipoPack } from '@/types';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface CartStore {
  items: CartItem[];
  codigoPostal: string;
  costoEnvio: number;
  zonaEnvio: string;

  addItem: (item: Omit<CartItem, 'subtotal' | 'unidades'> & { unidades?: number }) => Promise<{ success: boolean; error?: string }>;
  removeItem: (productId: string, tipoVenta: 'pack' | 'curva', tipoPack?: TipoPack) => Promise<void>;
  updateQuantity: (productId: string, tipoVenta: 'pack' | 'curva', tipoPack: TipoPack | undefined, cantidadItems: number) => Promise<{ success: boolean; error?: string }>;
  clearCart: () => Promise<void>;
  setShipping: (cp: string, costo: number, zona: string) => void;

  readonly subtotal: number;
  readonly total: number;
  readonly itemCount: number;
}

function getSessionId(): string {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

async function fetchStock(productId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('stock_unidades')
    .eq('id', productId)
    .single();
  if (error || !data) {
    console.error('❌ Error al consultar stock para', productId, error);
    return -1;
  }
  return data.stock_unidades;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      codigoPostal: '',
      costoEnvio: 0,
      zonaEnvio: '',

      addItem: async (item) => {
        const supabase = createClient();
        const sessionId = getSessionId();

        // Calcular unidades si no vienen
        const unidades = item.unidades ?? (item.cantidadItems * item.unidadesPorItem);

        // 1. Obtener stock actual
        const stockActual = await fetchStock(item.productId);
        if (stockActual === -1) {
          return { success: false, error: 'Error al verificar stock' };
        }
        if (stockActual === 0) {
          return { success: false, error: 'Producto sin stock' };
        }

        // 2. Calcular unidades totales de este producto en el carrito (todos los ítems)
        const unidadesExistentes = get().items
          .filter((i) => i.productId === item.productId)
          .reduce((sum, i) => sum + i.unidades, 0);

        const nuevasUnidades = unidadesExistentes + unidades;

        console.log(`📊 Stock: ${stockActual}, Existentes: ${unidadesExistentes}, Nuevas: ${nuevasUnidades}`);

        // 3. Verificar que no supere el stock
        if (nuevasUnidades > stockActual) {
          return { success: false, error: `Stock insuficiente. Disponible: ${stockActual} unidades` };
        }

        // 4. Reservar stock en la base de datos
        const { data: reserva, error: reservaError } = await supabase.rpc('reservar_stock_carrito', {
          p_product_id: item.productId,
          p_unidades: nuevasUnidades,
          p_session_id: sessionId,
        });

        if (reservaError || (reserva && reserva.success === false)) {
          const errorMsg = reserva?.error || reservaError?.message || 'No se pudo reservar stock';
          toast.error(errorMsg);
          return { success: false, error: errorMsg };
        }

        toast.success(`✅ Stock reservado por 5 minutos`, { duration: 3000 });

        // 5. Actualizar el estado del carrito
        set((state) => {
          // Buscar ítem existente con misma clave (productId + tipoVenta + tipoPack si aplica)
          const existingItem = state.items.find((i) => {
            if (i.productId !== item.productId) return false;
            if (i.tipoVenta !== item.tipoVenta) return false;
            if (item.tipoVenta === 'pack' && i.tipoPack !== item.tipoPack) return false;
            return true;
          });

          if (existingItem) {
            return {
              items: state.items.map((i) => {
                const same = i.productId === item.productId &&
                             i.tipoVenta === item.tipoVenta &&
                             (item.tipoVenta === 'pack' ? i.tipoPack === item.tipoPack : true);
                if (same) {
                  const newCantidad = i.cantidadItems + item.cantidadItems;
                  const newUnidades = i.unidades + unidades;
                  return {
                    ...i,
                    cantidadItems: newCantidad,
                    unidades: newUnidades,
                    subtotal: newCantidad * i.precioUnitario,
                  };
                }
                return i;
              }),
            };
          }

          const newItem: CartItem = {
            ...item,
            unidades,
            subtotal: item.cantidadItems * item.precioUnitario,
          };
          return { items: [...state.items, newItem] };
        });

        return { success: true };
      },

      removeItem: async (productId, tipoVenta, tipoPack) => {
        const supabase = createClient();
        const sessionId = getSessionId();

        const item = get().items.find((i) => {
          if (i.productId !== productId) return false;
          if (i.tipoVenta !== tipoVenta) return false;
          if (tipoVenta === 'pack' && i.tipoPack !== tipoPack) return false;
          return true;
        });

        if (item) {
          await supabase.rpc('liberar_reserva_carrito', {
            p_session_id: sessionId,
            p_product_id: productId,
            p_unidades: item.unidades,
          });
          toast('🔓 Stock liberado', { icon: '🔓' });
        }

        set((state) => ({
          items: state.items.filter((i) => {
            if (i.productId !== productId) return true;
            if (i.tipoVenta !== tipoVenta) return true;
            if (tipoVenta === 'pack' && i.tipoPack !== tipoPack) return true;
            return false;
          }),
        }));
      },

      updateQuantity: async (productId, tipoVenta, tipoPack, cantidadItems) => {
        if (cantidadItems <= 0) {
          await get().removeItem(productId, tipoVenta, tipoPack);
          return { success: true };
        }

        const supabase = createClient();
        const sessionId = getSessionId();

        // 1. Obtener stock actual
        const stockActual = await fetchStock(productId);
        if (stockActual === -1) {
          return { success: false, error: 'Error al verificar stock' };
        }

        // 2. Encontrar el ítem actual para saber unidades por item
        const item = get().items.find((i) => {
          if (i.productId !== productId) return false;
          if (i.tipoVenta !== tipoVenta) return false;
          if (tipoVenta === 'pack' && i.tipoPack !== tipoPack) return false;
          return true;
        });

        if (!item) return { success: false, error: 'Ítem no encontrado' };

        const nuevasUnidades = cantidadItems * item.unidadesPorItem;

        // 3. Calcular unidades de otros items del mismo producto (excluyendo el que se actualiza)
        const otrasUnidades = get().items
          .filter((i) => {
            if (i.productId !== productId) return false;
            if (i.tipoVenta !== tipoVenta) return false;
            if (tipoVenta === 'pack' && i.tipoPack !== tipoPack) return false;
            return true;
          })
          .reduce((sum, i) => sum + i.unidades, 0);

        const totalUnidades = otrasUnidades + nuevasUnidades;

        console.log(`🔄 Stock: ${stockActual}, Otras: ${otrasUnidades}, Total: ${totalUnidades}`);

        // 4. Validar que no supere el stock
        if (totalUnidades > stockActual) {
          return { success: false, error: `Stock insuficiente. Disponible: ${stockActual} unidades` };
        }

        // 5. Reservar el nuevo total
        const { data: reserva, error: reservaError } = await supabase.rpc('reservar_stock_carrito', {
          p_product_id: productId,
          p_unidades: totalUnidades,
          p_session_id: sessionId,
        });

        if (reservaError || (reserva && reserva.success === false)) {
          const errorMsg = reserva?.error || reservaError?.message || 'No se pudo reservar stock';
          toast.error(errorMsg);
          return { success: false, error: errorMsg };
        }

        // 6. Actualizar estado
        set((state) => ({
          items: state.items.map((i) => {
            const same = i.productId === productId &&
                         i.tipoVenta === tipoVenta &&
                         (tipoVenta === 'pack' ? i.tipoPack === tipoPack : true);
            if (same) {
              return {
                ...i,
                cantidadItems,
                unidades: nuevasUnidades,
                subtotal: cantidadItems * i.precioUnitario,
              };
            }
            return i;
          }),
        }));

        return { success: true };
      },

      clearCart: async () => {
        const supabase = createClient();
        const sessionId = getSessionId();

        await supabase.rpc('liberar_reserva_carrito', {
          p_session_id: sessionId,
        });

        set({ items: [], costoEnvio: 0, zonaEnvio: '', codigoPostal: '' });
        toast('🛒 Carrito vaciado', { icon: '🛒' });
      },

      setShipping: (cp, costo, zona) =>
        set({ codigoPostal: cp, costoEnvio: costo, zonaEnvio: zona }),

      get subtotal() {
        return get().items.reduce((acc, i) => acc + i.subtotal, 0);
      },
      get total() {
        return get().subtotal + get().costoEnvio;
      },
      get itemCount() {
        return get().items.reduce((acc, i) => acc + i.cantidadItems, 0);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        codigoPostal: state.codigoPostal,
        costoEnvio: state.costoEnvio,
        zonaEnvio: state.zonaEnvio,
      }),
    }
  )
);