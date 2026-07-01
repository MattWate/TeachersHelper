import CreateClassStep from './CreateClassStep.jsx';
import LearnerListStep from './LearnerListStep.jsx';
import ReadyStep from './ReadyStep.jsx';

export default function OnboardingFlow({ session, hasClass, hasLearners, loading, error, onLogout, onCreateClass, onAddLearner, onImportLearners }) {
  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Let's get you started</p>
          <h1>Set up your first class.</h1>
          <p className="hero-copy">Create a class, add your learners, then start capturing the small observations that make reports more personal.</p>
        </div>
        <div className="price-card workspace-card">
          <span>Your workspace</span>
          <strong>{session.fullName || 'Welcome'}</strong>
          <small>{session.email}</small>
          <button className="text-button" onClick={onLogout}>Log out</button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <section className="onboarding-grid">
        <CreateClassStep hasClass={hasClass} loading={loading} onCreateClass={onCreateClass} />
        <LearnerListStep hasClass={hasClass} hasLearners={hasLearners} loading={loading} onAddLearner={onAddLearner} onImportLearners={onImportLearners} />
        <ReadyStep hasClass={hasClass} hasLearners={hasLearners} />
      </section>
    </main>
  );
}
