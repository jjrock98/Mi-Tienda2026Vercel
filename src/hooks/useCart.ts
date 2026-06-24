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

  addItem: (item: Omit<CartItem, 'subtotal'>) => Promise<{ success: boolean; error?: string }>;
  removeItem: (productId: string, tipoPack: TipoPack) => Promise<void>;
  updateQuantity: (productId: string, tipoPack: TipoPack, cantidadPacks: number) => Promise<{ success: boolean; error?: string }>;
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

// ✅ Función para obtener el stock actual
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

        // 1. Obtener stock actual
        const stockActual = await fetchStock(item.productId);
        if (stockActual === -1) {
          return { success: false, error: 'Error al verificar stock' };
        }
        if (stockActual === 0) {
          return { success: false, error: 'Producto sin stock' };
        }

        // 2. Calcular unidades totales de este producto en el carrito (todos los packs)
        const unidadesExistentes = get().items
          .filter((i) => i.productId === item.productId)
          .reduce((sum, i) => sum + i.unidades, 0);

        const unidadesPorPack = item.tipoPack === 'media_docena' ? 6 : 12;
        const nuevasUnidades = unidadesExistentes + (item.cantidadPacks * unidadesPorPack);

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
          const existingItem = state.items.find(
            (i) => i.productId === item.productId && i.tipoPack === item.tipoPack
          );
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.tipoPack === item.tipoPack
                  ? {
                      ...i,
                      cantidadPacks: i.cantidadPacks + item.cantidadPacks,
                      unidades: i.unidades + (item.cantidadPacks * unidadesPorPack),
                      subtotal: (i.cantidadPacks + item.cantidadPacks) * i.precioUnitario,
                    }
                  : i
              ),
            };
          }
          const newItem: CartItem = {
            ...item,
            unidades: item.cantidadPacks * unidadesPorPack,
            subtotal: item.cantidadPacks * item.precioUnitario,
          };
          return { items: [...state.items, newItem] };
        });

        return { success: true };
      },

      removeItem: async (productId, tipoPack) => {
        const supabase = createClient();
        const sessionId = getSessionId();

        const item = get().items.find(i => i.productId === productId && i.tipoPack === tipoPack);
        if (item) {
          await supabase.rpc('liberar_reserva_carrito', {
            p_session_id: sessionId,
            p_product_id: productId,
            p_unidades: item.unidades,
          });
          toast('🔓 Stock liberado', { icon: '🔓' });
        }

        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.tipoPack === tipoPack)
          ),
        }));
      },

      updateQuantity: async (productId, tipoPack, cantidadPacks) => {
        if (cantidadPacks <= 0) {
          await get().removeItem(productId, tipoPack);
          return { success: true };
        }

        const supabase = createClient();
        const sessionId = getSessionId();

        // 1. Obtener stock actual
        const stockActual = await fetchStock(productId);
        if (stockActual === -1) {
          return { success: false, error: 'Error al verificar stock' };
        }

        const unidadesPorPack = tipoPack === 'media_docena' ? 6 : 12;
        const nuevasUnidades = cantidadPacks * unidadesPorPack;

        // 2. Calcular unidades de otros items del mismo producto (excluyendo el que se actualiza)
        const otrasUnidades = get().items
          .filter((i) => i.productId === productId && i.tipoPack !== tipoPack)
          .reduce((sum, i) => sum + i.unidades, 0);

        const totalUnidades = otrasUnidades + nuevasUnidades;

        console.log(`🔄 Stock: ${stockActual}, Otras: ${otrasUnidades}, Total: ${totalUnidades}`);

        // 3. Validar que no supere el stock
        if (totalUnidades > stockActual) {
          return { success: false, error: `Stock insuficiente. Disponible: ${stockActual} unidades` };
        }

        // 4. Reservar el nuevo total
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

        // 5. Actualizar estado
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.tipoPack === tipoPack
              ? {
                  ...i,
                  cantidadPacks,
                  unidades: nuevasUnidades,
                  subtotal: cantidadPacks * i.precioUnitario,
                }
              : i
          ),
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
        return get().items.reduce((acc, i) => acc + i.cantidadPacks, 0);
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