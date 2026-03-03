import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  panelId: string;
  createdAt: string;
  updatedAt: string;
}

export const taskApi = {
  getAll: () => apiGet<Task[]>('/tasks'),
  create: (text: string, panelId: string) => apiPost<Task>('/tasks', { text, panelId }),
  update: (id: string, updates: Partial<Pick<Task, 'text' | 'completed' | 'panelId'>>) =>
    apiPut<Task>(`/tasks/${id}`, updates),
  delete: (id: string) => apiDelete<{ message: string }>(`/tasks/${id}`),
};
