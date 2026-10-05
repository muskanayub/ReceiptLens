import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { CATEGORIES, formatDate, money } from '../lib/format.js';
import ReceiptEditor from './ReceiptEditor.jsx';

export default function ReceiptsTab({ version, onChanged }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [month, setMonth] = useState('');
  const [open, setOpen] = useState(null);

  const query = useCallback(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (category) p.set('category', category);
    if (month) p.set('month', month);
    return p.toString();
  }, [q, category, month]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api.get(`/receipts?${query()}`)
        .then((d) => { setReceipts(d.receipts); setError(''); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250); // wait briefly while the person types
    return () => clearTimeout(timer);
  }, [query, version]);

  async function exportCsv() {
    try {
      const blob = await api.blob(`/receipts/export.csv?${query()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipts.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  if (open) {
    return (
      <ReceiptEditor
        key={open._id}
        receipt={open}
        onClose={() => setOpen(null)}
        onSaved={() => { setOpen(null); onChanged(); }}
        onRemoved={() => { setOpen(null); onChanged(); }}
      />
    );
  }

  const field = 'rounded-md border border-line bg-surface px-3 py-2 text-sm';

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-3xl font-bold tracking-tight">Receipts</h1>
        <label className="text-sm font-medium">
          <span className="sr-only">Search stores</span>
          <input className={field} placeholder="Search stores" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          <span className="sr-only">Category</span>
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          <span className="sr-only">Month</span>
          <input type="month" className={field} value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button type="button" onClick={exportCsv} disabled={!receipts.length} className="rounded-md border border-ink px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white disabled:opacity-40">
          Export CSV
        </button>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}

      {!loading && receipts.length === 0 ? (
        <p className="mt-10 text-ink-soft">
          {q || category || month ? 'No receipts match these filters.' : 'No receipts yet. Scan one from the Scan tab.'}
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line rounded-lg border border-line bg-surface">
          {receipts.map((r) => (
            <li key={r._id}>
              <button type="button" onClick={() => setOpen(r)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-paper sm:grid-cols-[7rem_minmax(0,1fr)_14rem_7rem]">
                <span className="text-sm text-ink-soft">{formatDate(r.date)}</span>
                <span className="col-span-2 truncate font-medium sm:col-span-1 sm:col-start-2">{r.merchant || 'Unnamed store'}</span>
                <span className="col-start-1 text-sm whitespace-nowrap text-ink-soft sm:col-start-3">
                  {r.category}
                  {r.warnings?.length > 0 && !r.reviewed && <span className="ml-2 rounded bg-warn-bg px-1.5 py-0.5 text-xs font-medium text-warn">Needs a check</span>}
                </span>
                <span className="col-start-2 row-start-1 text-right font-mono font-medium sm:col-start-4 sm:row-start-auto">{money(r.total, r.currency)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
