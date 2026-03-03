import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface Panel {
  id: string;
  title: string;
  order: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export const panelApi = {
  getAll: () => apiGet<Panel[]>('/panels'),
  create: (title: string, dueDate?: string | null) =>
    apiPost<Panel>('/panels', { title, dueDate: dueDate ?? null }),
  update: (id: string, updates: Partial<Pick<Panel, 'title' | 'order' | 'dueDate'>>) =>
    apiPut<Panel>(`/panels/${id}`, updates),
  delete: (id: string) => apiDelete<{ message: string }>(`/panels/${id}`),
};
