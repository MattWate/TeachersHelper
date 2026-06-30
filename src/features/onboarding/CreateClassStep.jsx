import { useState } from 'react';

export default function CreateClassStep({ hasClass, loading, onCreateClass }) {
  const [className, setClassName] = useState('');

  function submit(event) {
    event.preventDefault();
    if (!className.trim()) return;
    onCreateClass(className.trim());
    setClassName('');
  }

  return (
    <article className={hasClass ? 'panel step-card complete' : 'panel step-card'}>
      <div className="step-number">1</div>
      <p className="eyebrow">Class</p>
      <h2>Name your class</h2>
      <p className="empty-state">Use the name you naturally use at school, such as Grade 3J or English Group A.</p>
      <form onSubmit={submit} className="note-form">
        <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Grade 3J" disabled={hasClass} />
        <button className="primary-button" type="submit" disabled={loading || hasClass}>{hasClass ? 'Class created' : 'Create class'}</button>
      </form>
    </article>
  );
}
