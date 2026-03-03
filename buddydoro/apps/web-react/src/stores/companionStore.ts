import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CompanionType = 'hedgehog' | 'fox' | 'bear';

export interface CompanionTheme {
  name: string;
  emoji: string;
  scene: 'autumn' | 'woodland' | 'winter';
  particleType: 'leaves' | 'petals' | 'snow';
}

export const COMPANION_THEMES: Record<CompanionType, CompanionTheme> = {
  hedgehog: { name: 'Hedgehog', emoji: '🦔', scene: 'autumn',   particleType: 'leaves'  },
  fox:      { name: 'Fox',      emoji: '🦊', scene: 'woodland', particleType: 'petals'  },
  bear:     { name: 'Bear Cub', emoji: '🐻', scene: 'winter',   particleType: 'snow'    },
};

interface CompanionState {
  companionType: CompanionType;
  life: number;
  maxLife: number;
  lastCareAt: number;
}

interface CompanionActions {
  setCompanionType: (type: CompanionType) => void;
  setLife: (n: number) => void;
  addLife: (delta: number) => void;
  markCare: () => void;
  applyDecay: () => void;
}

const MAX_LIFE = 14;

export const useCompanionStore = create<CompanionState & CompanionActions>()(
  persist(
    (set, get) => ({
      companionType: 'hedgehog',
      life: MAX_LIFE,
      maxLife: MAX_LIFE,
      lastCareAt: Date.now(),

      setCompanionType: (type) => set({ companionType: type }),
      setLife: (n) => set({ life: Math.max(0, Math.min(n, MAX_LIFE)) }),

      addLife: (delta) => {
        const { life } = get();
        set({ life: Math.max(0, Math.min(life + delta, MAX_LIFE)) });
      },

      markCare: () => set({ lastCareAt: Date.now() }),

      applyDecay: () => {
        const { life, lastCareAt } = get();
        if (life <= 0) return;
        const hoursElapsed = (Date.now() - lastCareAt) / (1000 * 60 * 60);
        const decay = Math.floor(hoursElapsed / 6);
        if (decay > 0) {
          set({ life: Math.max(0, life - decay), lastCareAt: Date.now() });
        }
      },
    }),
    {
      name: 'buddydoro-companion',
      partialize: (s) => ({ companionType: s.companionType, life: s.life, lastCareAt: s.lastCareAt }),
    }
  )
);
