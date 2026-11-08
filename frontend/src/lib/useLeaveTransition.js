import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Puente de salida para superficies que se desmontan al cerrarse.
 *
 * Sin esto, cerrar un modal o un menu hace que el nodo desaparezca en el
 * siguiente frame: la entrada se ve, la salida no. Este hook mantiene el
 * nodo montado mientras corre la animacion de salida y solo entonces avisa
 * al padre para que lo desmonte.
 *
 * Devuelve:
 *   leaving  -> true mientras la animacion de salida corre
 *   close()  -> dispara la salida y llama a onClose al terminar
 */
export function useLeaveTransition(isOpen, onClose, duration = 200) {
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Al reabrir se cancela cualquier salida en curso.
  useEffect(() => {
    if (isOpen) {
      clearTimeout(timerRef.current);
      setLeaving(false);
    }
  }, [isOpen]);

  const close = useCallback(() => {
    if (!onCloseRef.current) return;
    setLeaving(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLeaving(false);
      onCloseRef.current();
    }, duration);
  }, [duration]);

  return { leaving, close };
}
