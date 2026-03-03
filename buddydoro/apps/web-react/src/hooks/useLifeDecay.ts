import { useEffect } from 'react';
import { useCompanionStore } from '../stores/companionStore';

export function useLifeDecay() {
  useEffect(() => {
    useCompanionStore.getState().applyDecay();
    const id = setInterval(() => {
      useCompanionStore.getState().applyDecay();
    }, 60 * 60 * 1000); // check every hour
    return () => clearInterval(id);
  }, []);
}
