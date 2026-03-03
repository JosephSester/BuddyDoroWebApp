import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useToasts, registerToastFn } from '../../../hooks/useNotification';
import styles from './Toast.module.css';

export function ToastContainer() {
  const { toasts, addToast, removeToast } = useToasts();

  useEffect(() => {
    registerToastFn(addToast);
  }, [addToast]);

  return createPortal(
    <div className={styles.container}>
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${styles.toast} ${styles[t.type]}`}
          onClick={() => removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
