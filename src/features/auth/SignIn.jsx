import { useState } from 'react';

export default function SignIn({ onSignIn, loading, error }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const isCreateMode = mode === 'create';

  function submit(event) {
    event.preventDefault();
    onSignIn({
      mode,
      fullName: isCreateMode ? form.fullName.trim() : '',
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
  }

  return (
    <main className="app-shell login-shell">
      <section className="hero login-hero">
        <div>
          <p className="eyebrow">Teacher's Little Helper</p>
          <h1>Make report writing feel less rushed.</h1>
          <p className="hero-copy">Capture classroom observations as they happen, then use them to draft warmer, more specific learner reports when report season arrives.</p>
        </div>

        <form className="login-card" onSubmit={submit}>
          <div>
            <p className="eyebrow">{isCreateMode ? 'Create account' : 'Welcome back'}</p>
            <h2>{isCreateMode ? 'Create your workspace' : 'Sign in to your workspace'}</h2>
          </div>

          <div className="segmented-control" aria-label="Account mode">
            <button type="button" className={!isCreateMode ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button>
            <button type="button" className={isCreateMode ? 'active' : ''} onClick={() => setMode('create')}>Create account</button>
          </div>

          {isCreateMode && (
            <label>
              Name
              <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Mrs Smith" required />
            </label>
          )}

          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="teacher@example.com" required />
          </label>

          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Your password" required minLength={8} />
          </label>

          <p className="empty-state">{isCreateMode ? 'Create a password with at least 8 characters.' : 'Use the email and password linked to your workspace.'}</p>

          {error && <p className="error-message">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Opening...' : isCreateMode ? 'Create workspace' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
