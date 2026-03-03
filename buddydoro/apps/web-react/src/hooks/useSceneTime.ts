import { useEffect } from 'react';
import { useSceneStore } from '../stores/sceneStore';

export function useSceneTime() {
  useEffect(() => {
    useSceneStore.getState().checkTime();
    const id = setInterval(() => {
      useSceneStore.getState().checkTime();
    }, 5 * 60 * 1000); // check every 5 min
    return () => clearInterval(id);
  }, []);
}
