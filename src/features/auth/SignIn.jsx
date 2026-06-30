import { useState } from 'react';

export default function SignIn({ onSignIn, loading, error }) {
  const [form, setForm] = useState({ fullName: '', email: '' });

  function submit(event) {
    event.preventDefault();
    onSignIn({
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
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
            <p className="eyebrow">Get started</p>
            <h2>Open your workspace</h2>
          </div>

          <label>
            Name
            <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Mrs Smith" />
          </label>

          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="teacher@example.com" required />
          </label>

          {error && <p className="error-message">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Opening...' : 'Open workspace'}</button>
        </form>
      </section>
    </main>
  );
}
