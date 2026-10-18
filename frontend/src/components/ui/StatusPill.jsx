// Píldora de estado de proyecto con role="status" para lectores de pantalla.
// No sustituye al StatusPill de common.jsx (lo complementa con la nueva escala).
const STATUS_LABEL = {
  open: 'Abierto',
  'in-progress': 'En curso',
  completed: 'Completado',
  closed: 'Cerrado',
};

export default function StatusPill({ status = 'open', label, ...rest }) {
  return (
    <span role="status" className={`ui-status ui-status--${status}`} {...rest}>
      {label ?? STATUS_LABEL[status] ?? status}
    </span>
  );
}
