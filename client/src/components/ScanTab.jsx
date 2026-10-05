import { useRef, useState } from 'react';
import { api } from '../api.js';
import { prepareImage } from '../lib/image.js';
import ReceiptEditor from './ReceiptEditor.jsx';

export default function ScanTab({ onChanged }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [dragging, setDragging] = useState(false);

  async function scan(file) {
    if (!file || busy) return;
    setError('');
    setSaved('');
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      const form = new FormData();
      form.append('image', prepared);
      const data = await api.post('/receipts', form);
      setReceipt(data.receipt);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <ReceiptEditor
        key={receipt._id}
        receipt={receipt}
        isNew
        onSaved={(r) => {
          setReceipt(null);
          setSaved(`Saved ${r.merchant || 'receipt'}.`);
          onChanged();
        }}
        onRemoved={() => {
          setReceipt(null);
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">Scan a receipt</h1>
      <p className="mt-2 text-ink-soft">Take a photo or upload one. You will be able to check and correct everything before it is saved.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); scan(e.dataTransfer.files?.[0]); }}
        className={`mt-6 rounded-lg border-2 border-dashed px-6 py-14 text-center ${dragging ? 'border-brand bg-brand/5' : 'border-line bg-surface'}`}
      >
        {busy ? (
          <div role="status" className="flex flex-col items-center gap-3">
            <span className="size-8 animate-spin rounded-full border-2 border-line border-t-brand" />
            <p className="font-medium">Reading your receipt…</p>
            <p className="text-sm text-ink-soft">This usually takes a few seconds.</p>
          </div>
        ) : (
          <>
            <p className="font-medium">Drop a receipt photo here</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
            >
              Choose a photo
            </button>
            <p className="mt-3 text-sm text-ink-soft">JPG, PNG or WebP. On a phone this opens the camera.</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(e) => { scan(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>

      {error && <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      {saved && <p role="status" className="mt-4 rounded-md border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand-dark">{saved} Scan another, or check the Receipts tab.</p>}

      <p className="mt-8 text-sm text-ink-soft">
        Tips for a good read: lay the receipt flat, fill the frame, use even light, and keep the whole receipt in view.
      </p>
    </div>
  );
}
