import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, TipoPack } from '@/types';

interface CartStore {
  items: CartItem[];
  codigoPostal: string;
  costoEnvio: number;
  zonaEnvio: string;

  addItem: (item: Omit<CartItem, 'subtotal'>) => void;
  removeItem: (productId: string, tipoPack: TipoPack) => void;
  updateQuantity: (productId: string, tipoPack: TipoPack, cantidadPacks: number) => void;
  clearCart: () => void;
  setShipping: (cp: string, costo: number, zona: string) => void;

  readonly subtotal: number;
  readonly total: number;
  readonly itemCount: number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      codigoPostal: '',
      costoEnvio: 0,
      zonaEnvio: '',

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.tipoPack === item.tipoPack
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.tipoPack === item.tipoPack
                  ? {
                      ...i,
                      cantidadPacks: i.cantidadPacks + item.cantidadPacks,
                      unidades: i.unidades + item.unidades,
                      subtotal: (i.cantidadPacks + item.cantidadPacks) * i.precioUnitario,
                    }
                  : i
              ),
            };
          }
          const newItem: CartItem = {
            ...item,
            subtotal: item.cantidadPacks * item.precioUnitario,
          };
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (productId, tipoPack) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.tipoPack === tipoPack)
          ),
        }));
      },

      updateQuantity: (productId, tipoPack, cantidadPacks) => {
        if (cantidadPacks <= 0) {
          get().removeItem(productId, tipoPack);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.tipoPack === tipoPack
              ? {
                  ...i,
                  cantidadPacks,
                  unidades: cantidadPacks * (tipoPack === 'media_docena' ? 6 : 12),
                  subtotal: cantidadPacks * i.precioUnitario,
                }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [], costoEnvio: 0, zonaEnvio: '', codigoPostal: '' }),

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
