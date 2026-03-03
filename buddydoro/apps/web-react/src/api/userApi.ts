import { apiPatch } from './client';

export const userApi = {
  patchDoros: (delta: number) =>
    apiPatch<{ doros: number }>('/user/doros', { delta }),

  patchDiamonds: (delta: number) =>
    apiPatch<{ diamonds: number }>('/user/diamonds', { delta }),

  patchOnboarding: () =>
    apiPatch<{ hasSeenOnboarding: boolean }>('/user/onboarding', { hasSeenOnboarding: true }),
};
