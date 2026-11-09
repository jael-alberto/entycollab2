import { createContext, useCallback, useContext, useState } from 'react';
import { Icon } from '../components/common.jsx';

const ToastContext = createContext(null);

// Icono por tipo: el estado nunca se comunica solo con color.
const TOAST_ICON = {
  success: 'check',
  error: 'alert',
  info: 'sparkles'
};

const TOAST_LABEL = {
  success: 'Correcto',
  error: 'Error',
  info: 'Aviso'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 180);
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    setToasts(prev => [...prev, { id, message, type, leaving: false }]);
    setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast, toasts, dismiss }}>
      {children}
      <div id="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type}${t.leaving ? ' is-leaving' : ''}`}
            role={t.type === 'error' ? 'alert' : 'status'}
          >
            <span className="toast-icon" aria-hidden="true">
              <Icon name={TOAST_ICON[t.type] || TOAST_ICON.info} size={16} />
            </span>
            <p className="toast-message">{t.message}</p>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label={`Cerrar aviso: ${TOAST_LABEL[t.type] || TOAST_LABEL.info}`}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
