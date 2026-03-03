import { apiPost } from './client';

export const aiApi = {
  getPlan: (goal: string) =>
    apiPost<{ tasks: string[] }>('/ai', { goal }),
};
