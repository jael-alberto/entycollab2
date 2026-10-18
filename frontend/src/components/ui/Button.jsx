// Botón base accesible: primary (CTA) / outline / ghost / danger + sm.
// - primary: fondo brand-500 + texto blanco bold grande (ver tokens.css).
// - loading: muestra spinner y expone aria-busy + aria-disabled.
// - disabled: opacity .5 (ver ui.css). Foco visible 2px (ver ui.css).
export default function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  loading = false,
  disabled = false,
  type = 'button',
  children,
  ...rest
}) {
  const cls = [
    'ui-btn',
    `ui-btn--${variant}`,
    size === 'sm' ? 'ui-btn--sm' : '',
    full ? 'ui-btn--full' : '',
  ].filter(Boolean).join(' ');
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={cls}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      {...rest}
    >
      {loading && <span className="ui-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
