// Skeleton de tarjeta: marcador de carga decorativo (aria-hidden) con texto
// alternativo para lectores vía aria-label en el contenedor.
export default function Skeleton({
  variant = 'card',
  lines = 3,
  label = 'Cargando contenido…',
  ...rest
}) {
  if (variant !== 'card') return null;
  return (
    <div className="ui-skeleton-card" role="status" aria-label={label} {...rest}>
      <div className="ui-skeleton-line ui-skeleton-media" aria-hidden="true" />
      <div className="ui-skeleton-line ui-skeleton-line--title" aria-hidden="true" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`ui-skeleton-line${i === lines - 1 ? ' ui-skeleton-line--short' : ''}`}
        />
      ))}
    </div>
  );
}
