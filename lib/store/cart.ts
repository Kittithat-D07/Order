"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

interface CartState {
  tableId: string | null;
  tableNumber: string | null;
  items: CartItem[];
  setTable: (id: string, number: string) => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNote: (menuItemId: string, note: string) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
  total: () => number;
  totalItems: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      tableId: null,
      tableNumber: null,
      items: [],

      setTable: (id, number) => {
        if (get().tableId !== id) {
          set({ tableId: id, tableNumber: number, items: [] });
        }
      },

      addItem: (item) => {
        const qty = item.quantity ?? 1;
        const items = get().items;
        const existing = items.find((i) => i.menu_item_id === item.menu_item_id);
        if (existing) {
          // Pure update — never mutate the item object in place. Mutating here
          // rewrites the persisted state under Zustand's feet, so the quantity
          // change can be lost and React can miss the re-render.
          set({
            items: items.map((i) =>
              i.menu_item_id === item.menu_item_id
                ? { ...i, quantity: i.quantity + qty }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity: qty }] });
        }
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.menu_item_id !== menuItemId) });
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menu_item_id === menuItemId ? { ...i, quantity } : i
          ),
        });
      },

      updateNote: (menuItemId, note) => {
        set({
          items: get().items.map((i) =>
            i.menu_item_id === menuItemId ? { ...i, note } : i
          ),
        });
      },

      removeItem: (menuItemId) => {
        set({ items: get().items.filter((i) => i.menu_item_id !== menuItemId) });
      },

      clear: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "qr-order-cart" }
  )
);
