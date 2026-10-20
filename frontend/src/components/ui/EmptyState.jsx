// EmptyState extendido: misma API que common.jsx ({ icon, title, sub })
// + prop `action` (nodo React: botón/enlace, p. ej. "Crear cuenta",
// "Postularse") + `children` como alternativa. No rompe llamadas existentes.
// `icon` es un nombre del set Icon de common.jsx (p. ej. 'folder').
import { Icon } from '../common.jsx';

export default function EmptyState({
  icon = 'folder',
  title,
  sub,
  action = null,
  children = null,
  ...rest
}) {
  return (
    <div className="ui-empty" role="status" {...rest}>
      {icon && (
        <div className="ui-empty__icon" aria-hidden="true">
          <Icon name={icon} size={28} />
        </div>
      )}
      {title && <h3 className="ui-empty__title">{title}</h3>}
      {sub && <p className="ui-empty__sub">{sub}</p>}
      {(action || children) && (
        <div className="ui-empty__action">
          {action}
          {children}
        </div>
      )}
    </div>
  );
}
