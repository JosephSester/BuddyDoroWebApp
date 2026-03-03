import { useState, useCallback, useRef } from 'react';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let _addToast: ((msg: string, type: ToastNotification['type']) => void) | null = null;

export function registerToastFn(fn: typeof _addToast) {
  _addToast = fn;
}

export function notify(message: string, type: ToastNotification['type'] = 'info') {
  _addToast?.(message, type);
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastNotification['type'] = 'info') => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
