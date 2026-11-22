import { PAYMENT_METHODS } from '../config';

export function formatRs(value) {
  const n = Number(value) || 0;
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatSignedRs(value) {
  const n = Number(value) || 0;
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${formatRs(Math.abs(n))}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysLeft(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/[\s_.-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function methodName(id) {
  return PAYMENT_METHODS.find((m) => m.id === id)?.name ?? id;
}

/** "ali.raza_92@gmail.com" -> "Ali Raza" (words from the part before @, digits removed, capitalised) */
export function nameFromEmail(email) {
  return String(String(email || '').split('@')[0] || '')
    .replace(/[0-9]+/g, ' ')
    .split(/[._\-+\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 40)
    .trim();
}

/** Accepts 03XXXXXXXXX, 3XXXXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX (spaces/dashes allowed). Returns 03XXXXXXXXX or null. */
export function normalizePkPhone(input) {
  const digits = String(input || '').replace(/[\s-]/g, '').replace(/^\+/, '');
  let m = digits.match(/^92(3\d{9})$/) || digits.match(/^0?(3\d{9})$/);
  return m ? `0${m[1]}` : null;
}
