const round2 = (n) => Math.round(n * 100) / 100;

export function parseAmount(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? round2(n) : null;
}

export function itemsSum(items) {
  return round2(items.reduce((sum, i) => sum + (parseAmount(i.price) || 0), 0));
}

export function checkTotals(form) {
  const warnings = [];
  const items = form.items.filter((i) => i.name.trim());
  const sum = itemsSum(items);
  const total = parseAmount(form.total);
  const subtotal = parseAmount(form.subtotal);
  const discount = parseAmount(form.discount) || 0;
  const tax = parseAmount(form.tax) || 0;
  const tip = parseAmount(form.tip) || 0;

  if (!items.length) warnings.push('No line items. Add them, or keep just the total.');
  if (total == null) {
    warnings.push('Enter the total.');
    return warnings;
  }

  const tolerance = Math.max(0.06, Math.abs(total) * 0.005);
  if (subtotal != null && items.length && Math.abs(subtotal - sum) > tolerance) {
    warnings.push(`The items add up to ${sum.toFixed(2)}, but the subtotal reads ${subtotal.toFixed(2)}.`);
  }
  if (items.length || subtotal != null) {
    const base = subtotal ?? sum;
    const withTax = round2(base - discount + tax + tip);
    const taxIncluded = round2(base - discount + tip);
    if (![withTax, taxIncluded].some((e) => Math.abs(e - total) <= tolerance)) {
      warnings.push(`The items, tax and tip add up to ${withTax.toFixed(2)}, but the total reads ${total.toFixed(2)}.`);
    }
  }
  return warnings;
}
