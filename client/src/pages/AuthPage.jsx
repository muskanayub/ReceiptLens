import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await (isRegister ? register(form) : login({ email: form.email, password: form.password }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = 'mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[15px]';

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <p className="text-2xl font-bold tracking-tight">ReceiptLens</p>
        <h1 className="mt-6 max-w-lg text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
          Snap a receipt. Get clean numbers.
        </h1>
        <p className="mt-5 max-w-md text-lg text-ink-soft">
          Upload a photo and ReceiptLens reads the store, date, items and total. It checks that the numbers add up,
          so you only fix what is wrong.
        </p>
      </section>

      <section className="flex items-center justify-center bg-surface px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm" noValidate>
          <h2 className="text-2xl font-bold">{isRegister ? 'Create your account' : 'Sign in'}</h2>

          <div className="mt-6 space-y-4">
            {isRegister && (
              <label className="block text-sm font-medium">
                Name
                <input className={field} value={form.name} onChange={set('name')} autoComplete="name" required />
              </label>
            )}
            <label className="block text-sm font-medium">
              Email
              <input type="email" className={field} value={form.email} onChange={set('email')} autoComplete="email" required />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                className={field}
                value={form.password}
                onChange={set('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
              {isRegister && <span className="mt-1 block text-xs font-normal text-ink-soft">Use at least 8 characters.</span>}
            </label>
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>

          <p className="mt-5 text-sm text-ink-soft">
            {isRegister ? 'Already have an account?' : 'New to ReceiptLens?'}{' '}
            <button
              type="button"
              className="font-semibold text-brand underline underline-offset-2"
              onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
