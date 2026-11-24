import { Link } from 'react-router-dom';
import { REGISTRATION_FORM_URL } from '../lib/registration.js';

/**
 * Enlace de "Crear cuenta" con interruptor temporal.
 * Con la URL del formulario activa apunta al formulario; sin ella, al registro
 * interno de siempre. No hay que tocar los llamadores para revertir el cambio.
 */
export default function RegisterLink({ children, ...props }) {
  if (REGISTRATION_FORM_URL) {
    return <a href={REGISTRATION_FORM_URL} {...props}>{children}</a>;
  }
  return <Link to="/register" {...props}>{children}</Link>;
}
