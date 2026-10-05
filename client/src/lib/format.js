export const CATEGORIES = [
  'Groceries', 'Dining', 'Transport', 'Shopping', 'Health',
  'Utilities', 'Entertainment', 'Travel', 'Other',
];

export function money(value, currency = 'INR') {
  if (value === null || value === undefined || value === '') return '—';
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

export const toDateInput = (iso) => (iso ? String(iso).slice(0, 10) : '');

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
}
