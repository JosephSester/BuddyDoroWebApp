import { create } from 'zustand';

interface SceneState {
  isNight: boolean;
  isRaining: boolean;
}

interface SceneActions {
  checkTime: () => void;
  setRaining: (v: boolean) => void;
}

function computeIsNight(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

function shouldRain(): boolean {
  // ~20% chance of rain, changes every 30 min slot
  const slot = Math.floor(Date.now() / (30 * 60 * 1000));
  const hash = (slot * 2654435761) >>> 0;
  return (hash % 100) < 20;
}

export const useSceneStore = create<SceneState & SceneActions>((set) => ({
  isNight: computeIsNight(),
  isRaining: shouldRain(),

  checkTime: () => set({ isNight: computeIsNight(), isRaining: shouldRain() }),
  setRaining: (v) => set({ isRaining: v }),
}));
