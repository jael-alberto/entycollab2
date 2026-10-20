// ==========================================================================
// VALIDACIÓN DE FORMULARIOS (Agente E)
// Helpers puros: reciben el valor y devuelven la CLAVE i18n del error
// (o '' si es válido). Los componentes resuelven el texto con t().
// Reglas: título ≥8, desc ≥40, slots 1-20, deadline>hoy, tech ≥1,
// pitch 140-500, stars 1-5.
// ==========================================================================

export const TITLE_MIN = 8;
export const DESC_MIN = 40;
export const SLOTS_MIN = 1;
export const SLOTS_MAX = 20;
export const PITCH_MIN = 140;
export const PITCH_MAX = 500;
export const MESSAGE_MAX = 500;
export const PASSWORD_MIN = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,}$/;

export function requiredKey(value) {
  return String(value ?? '').trim() ? '' : 'form.required';
}

export function titleKey(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'form.required';
  return v.length >= TITLE_MIN ? '' : 'form.titleMin';
}

export function descKey(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'form.required';
  return v.length >= DESC_MIN ? '' : 'form.descMin';
}

export function slotsKey(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= SLOTS_MIN && n <= SLOTS_MAX ? '' : 'form.slotsRange';
}

export function deadlineKey(iso) {
  if (!iso) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return 'form.deadlineFuture';
  return d > today ? '' : 'form.deadlineFuture';
}

export function techKey(list) {
  return Array.isArray(list) && list.length > 0 ? '' : 'form.techMin';
}

export function pitchKey(value) {
  const len = String(value ?? '').trim().length;
  return len >= PITCH_MIN && len <= PITCH_MAX ? '' : 'form.pitchRange';
}

export function emailKey(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'form.required';
  return EMAIL_RE.test(v) ? '' : 'form.emailInvalid';
}

export function passwordKey(value, { allowEmpty = false } = {}) {
  const v = String(value ?? '');
  if (!v && allowEmpty) return '';
  if (!v) return 'form.required';
  return v.length >= PASSWORD_MIN ? '' : 'form.passwordMin';
}

export function usernameKey(value) {
  const v = String(value ?? '').trim().replace(/^@/, '');
  if (!v) return 'form.required';
  return USERNAME_RE.test(v) ? '' : 'form.usernameInvalid';
}

export function nameKey(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'form.required';
  return v.length >= 2 ? '' : 'form.nameMin';
}

export function messageKey(value, max = MESSAGE_MAX) {
  const v = String(value ?? '');
  return v.length <= max ? '' : 'form.messageMax';
}

export function starsKey(map) {
  const rated = Object.values(map || {}).filter(s => Number(s) >= 1 && Number(s) <= 5);
  return rated.length > 0 ? '' : 'form.starsRequired';
}

/** Cuenta caracteres visibles (respeta el límite del pitch). */
export function charCount(value) {
  return String(value ?? '').length;
}
