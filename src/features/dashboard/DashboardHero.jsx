export default function DashboardHero({ session, onLogout }) {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Teacher's Little Helper</p>
        <h1>Capture learner moments now. Draft better reports later.</h1>
        <p className="hero-copy">Build a useful memory of each learner through quick notes, then turn those observations into thoughtful report drafts.</p>
      </div>
      <div className="price-card workspace-card">
        <span>Your workspace</span>
        <strong>{session.fullName || 'Welcome'}</strong>
        <small>{session.email}</small>
        <button className="text-button" onClick={onLogout}>Log out</button>
      </div>
    </section>
  );
}
