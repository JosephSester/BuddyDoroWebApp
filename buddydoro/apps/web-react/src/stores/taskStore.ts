import { create } from 'zustand';
import { taskApi } from '../api/taskApi';
import type { Task } from '../api/taskApi';
import { panelApi } from '../api/panelApi';
import type { Panel } from '../api/panelApi';

interface TaskState {
  panels: Panel[];
  tasks: Task[];
  activeTaskId: string | null;
  focusedPanelId: string | null;
  isLoaded: boolean;
}

interface TaskActions {
  loadAll: () => Promise<void>;
  createPanel: (title?: string, dueDate?: string | null) => Promise<Panel>;
  updatePanel: (id: string, updates: Partial<Pick<Panel, 'title' | 'order' | 'dueDate'>>) => Promise<void>;
  deletePanel: (id: string) => Promise<void>;
  createTask: (text: string, panelId: string) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Pick<Task, 'text' | 'completed' | 'panelId'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setActiveTask: (id: string | null) => void;
  setFocusedPanel: (id: string | null) => void;
  getActiveTask: () => Task | undefined;
  getTasksByPanel: (panelId: string) => Task[];
}

export const useTaskStore = create<TaskState & TaskActions>((set, get) => ({
  panels: [],
  tasks: [],
  activeTaskId: null,
  focusedPanelId: null,
  isLoaded: false,

  loadAll: async () => {
    const [panels, tasks] = await Promise.all([panelApi.getAll(), taskApi.getAll()]);
    const sorted = [...panels].sort((a, b) => a.order - b.order);
    set({ panels: sorted, tasks, isLoaded: true });
  },

  createPanel: async (title = 'Goal', dueDate) => {
    const panel = await panelApi.create(title, dueDate);
    set(s => ({ panels: [...s.panels, panel].sort((a, b) => a.order - b.order) }));
    return panel;
  },

  updatePanel: async (id, updates) => {
    const panel = await panelApi.update(id, updates);
    set(s => ({ panels: s.panels.map(p => p.id === id ? panel : p) }));
  },

  deletePanel: async (id) => {
    await panelApi.delete(id);
    set(s => ({
      panels: s.panels.filter(p => p.id !== id),
      tasks: s.tasks.filter(t => t.panelId !== id),
      focusedPanelId: s.focusedPanelId === id ? null : s.focusedPanelId,
    }));
  },

  createTask: async (text, panelId) => {
    const task = await taskApi.create(text, panelId);
    set(s => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (id, updates) => {
    const task = await taskApi.update(id, updates);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? task : t) }));
  },

  deleteTask: async (id) => {
    await taskApi.delete(id);
    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
      activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
    }));
  },

  setActiveTask: (id) => set({ activeTaskId: id }),
  setFocusedPanel: (id) => set({ focusedPanelId: id }),

  getActiveTask: () => {
    const { tasks, activeTaskId } = get();
    return tasks.find(t => t.id === activeTaskId);
  },

  getTasksByPanel: (panelId) => get().tasks.filter(t => t.panelId === panelId),
}));
