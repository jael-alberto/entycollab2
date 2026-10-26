// Badge genérico para rol (owner/admin/member) o estado.
// `tone`: 'role-owner' | 'role-admin' | 'role-member'
//       | 'status-open' | 'status-in-progress' | 'status-completed' | 'status-closed'
//       | 'brand' | 'neutral'. `dot`: muestra punto indicador.
const ROLE_LABEL = { owner: 'Propietario', admin: 'Administrador', member: 'Miembro' };

export default function Badge({ tone = 'neutral', dot = false, role, children, ...rest }) {
  const resolvedTone = role ? `role-${role}` : tone;
  const label = children ?? (role ? ROLE_LABEL[role] ?? role : null);
  return (
    <span className={`ui-badge ui-badge--${resolvedTone}`} {...rest}>
      {dot && <span className="ui-badge__dot" aria-hidden="true" />}
      {label}
    </span>
  );
}
