import { create } from 'zustand';
import { userApi } from '../api/userApi';

interface CurrencyState {
  doros: number;
  diamonds: number;
}

interface CurrencyActions {
  setDoros: (n: number) => void;
  setDiamonds: (n: number) => void;
  addDoros: (delta: number) => Promise<void>;
  spendDoros: (amount: number) => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState & CurrencyActions>((set, get) => ({
  doros: 0,
  diamonds: 0,

  setDoros: (n) => set({ doros: n }),
  setDiamonds: (n) => set({ diamonds: n }),

  addDoros: async (delta) => {
    const prev = get().doros;
    set({ doros: prev + delta }); // optimistic
    try {
      const res = await userApi.patchDoros(delta);
      set({ doros: res.doros });
    } catch {
      set({ doros: prev }); // rollback
    }
  },

  spendDoros: async (amount) => {
    const prev = get().doros;
    if (prev < amount) throw new Error('Not enough doros');
    set({ doros: prev - amount }); // optimistic
    try {
      const res = await userApi.patchDoros(-amount);
      set({ doros: res.doros });
    } catch {
      set({ doros: prev }); // rollback
      throw new Error('Failed to spend doros');
    }
  },
}));
