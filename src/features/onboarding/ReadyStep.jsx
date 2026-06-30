export default function ReadyStep({ hasClass, hasLearners }) {
  return (
    <article className="panel step-card">
      <div className="step-number">3</div>
      <p className="eyebrow">Ready</p>
      <h2>Start capturing moments</h2>
      <p className="empty-state">Once your learners are added, your dashboard will open automatically.</p>
      <button className="primary-button" type="button" disabled={!hasClass || !hasLearners}>Open dashboard</button>
    </article>
  );
}
