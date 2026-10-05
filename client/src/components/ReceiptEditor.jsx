import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { CATEGORIES, money, toDateInput } from '../lib/format.js';
import { checkTotals, itemsSum } from '../lib/totals.js';

const str = (v) => (v === null || v === undefined ? '' : String(v));

const toForm = (r) => ({
  merchant: r.merchant || '',
  date: toDateInput(r.date),
  category: r.category || 'Other',
  currency: r.currency || 'INR',
  items: (r.items || []).map((i) => ({ name: i.name, qty: str(i.qty ?? 1), price: str(i.price) })),
  subtotal: str(r.subtotal),
  discount: str(r.discount),
  tax: str(r.tax),
  tip: str(r.tip),
  total: str(r.total),
  notes: r.notes || '',
});

const input = 'w-full rounded border border-line bg-surface px-2 py-1.5 text-[15px]';
const amount = `${input} text-right font-mono`;

function Row({ label, value, onChange, strong }) {
  return (
    <label className={`flex items-center justify-between gap-4 ${strong ? 'text-base font-semibold' : 'text-sm'}`}>
      <span>{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 shrink-0 rounded border border-line bg-surface px-2 py-1.5 text-right font-mono text-[15px]"
      />
    </label>
  );
}

/** Photo on the left, editable extracted receipt on the right. Used right after a scan and when reopening one. */
export default function ReceiptEditor({ receipt, isNew, onSaved, onRemoved, onClose }) {
  const [form, setForm] = useState(() => toForm(receipt));
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let url = '';
    let cancelled = false;
    api.blob(`/receipts/${receipt._id}/image`)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [receipt._id]);

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const setItem = (index, field, value) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)) }));

  const warnings = useMemo(() => checkTotals(form), [form]);
  const sum = itemsSum(form.items);

  async function save() {
    setBusy(true);
    setError('');
    try {
      const data = await api.put(`/receipts/${receipt._id}`, form);
      onSaved(data.receipt);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!isNew && !window.confirm('Delete this receipt? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.del(`/receipts/${receipt._id}`);
      onRemoved(receipt._id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="lg:sticky lg:top-4 lg:self-start">
        {imageUrl ? (
          <img src={imageUrl} alt="Photo of the receipt" className="max-h-[75vh] w-full rounded-lg border border-line bg-surface object-contain" />
        ) : (
          <div className="grid h-64 place-items-center rounded-lg border border-line bg-surface text-sm text-ink-soft">Loading photo…</div>
        )}
      </div>

      <div className="receipt-wrap">
        <div className="receipt-paper px-5 pt-5 sm:px-7 sm:pt-6">
          {warnings.length > 0 && (
            <div role="status" className="mb-5 border-l-4 border-warn bg-warn-bg px-3 py-2.5 text-sm text-warn">
              <p className="font-semibold">Check these before saving</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              Store
              <input className={`${input} mt-1 text-base font-semibold`} value={form.merchant} onChange={(e) => set('merchant')(e.target.value)} />
            </label>
            <label className="block text-sm font-medium">
              Date
              <input type="date" className={`${input} mt-1`} value={form.date} onChange={(e) => set('date')(e.target.value)} />
            </label>
            <label className="block text-sm font-medium">
              Category
              <select className={`${input} mt-1`} value={form.category} onChange={(e) => set('category')(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Currency
              <input className={`${input} mt-1 font-mono uppercase`} maxLength={3} value={form.currency} onChange={(e) => set('currency')(e.target.value.toUpperCase())} />
            </label>
          </div>

          <h3 className="mt-6 border-t border-dashed border-ink-soft/50 pt-4 text-sm font-semibold">Items</h3>
          <ul className="mt-2 space-y-3 sm:space-y-2">
            {form.items.map((item, i) => (
              <li key={i} className="grid grid-cols-[4rem_minmax(0,1fr)_1.75rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_3.5rem_6.5rem_1.75rem]">
                <input aria-label={`Item ${i + 1} name`} className={`${input} col-span-3 sm:col-span-1`} value={item.name} onChange={(e) => setItem(i, 'name', e.target.value)} />
                <input aria-label={`Item ${i + 1} quantity`} placeholder="Qty" inputMode="decimal" className={`${amount} px-1`} value={item.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} />
                <input aria-label={`Item ${i + 1} price`} placeholder="Amount" inputMode="decimal" className={amount} value={item.price} onChange={(e) => setItem(i, 'price', e.target.value)} />
                <button
                  type="button"
                  aria-label={`Remove item ${i + 1}`}
                  onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}
                  className="rounded text-lg leading-none text-ink-soft hover:text-danger"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {form.items.length > 0 && (
            <p className="mt-1 hidden grid-cols-[minmax(0,1fr)_3.5rem_6.5rem_1.75rem] gap-2 text-xs text-ink-soft sm:grid">
              <span>Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span><span />
            </p>
          )}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, items: [...f.items, { name: '', qty: '1', price: '' }] }))}
            className="mt-3 text-sm font-semibold text-brand underline underline-offset-2"
          >
            Add item
          </button>

          <div className="mt-6 space-y-2 border-t border-dashed border-ink-soft/50 pt-4">
            <p className="flex justify-between text-sm text-ink-soft">
              <span>Items add up to</span>
              <span className="font-mono">{money(sum, form.currency || 'INR')}</span>
            </p>
            <Row label="Subtotal" value={form.subtotal} onChange={set('subtotal')} />
            <Row label="Discount" value={form.discount} onChange={set('discount')} />
            <Row label="Tax" value={form.tax} onChange={set('tax')} />
            <Row label="Tip or service charge" value={form.tip} onChange={set('tip')} />
            <div className="border-t border-ink pt-2">
              <Row label="Total" value={form.total} onChange={set('total')} strong />
            </div>
          </div>

          <label className="mt-5 block text-sm font-medium">
            Notes
            <input className={`${input} mt-1`} maxLength={300} value={form.notes} onChange={(e) => set('notes')(e.target.value)} />
          </label>

          {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={busy} className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {busy ? 'Saving…' : 'Save receipt'}
            </button>
            {!isNew && (
              <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-line px-4 py-2.5 font-medium hover:border-ink-soft">
                Back to list
              </button>
            )}
            <button type="button" onClick={remove} disabled={busy} className="ml-auto text-sm font-medium text-danger underline underline-offset-2">
              {isNew ? 'Discard this scan' : 'Delete receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
