import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let _toastId = 0;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `toast-${Date.now()}-${++_toastId}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
      <div id="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            {...(t.type === 'error'
              ? { role: 'alert' }
              : { role: 'status' })}
          >{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

