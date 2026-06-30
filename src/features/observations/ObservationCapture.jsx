import { useState } from 'react';
import { displayLearnerName, wordCount } from '../../shared/dashboardModel.js';

export default function ObservationCapture({ learner, observations, loading, onSaveObservation }) {
  const [noteType, setNoteType] = useState('typed');
  const [text, setText] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!learner || !text.trim()) return;
    await onSaveObservation({ observationType: noteType, text: text.trim(), durationSeconds: noteType === 'voice' ? 20 : 0 });
    setText('');
  }

  return (
    <section className="panel capture-panel">
      <div className="panel-header"><div><p className="eyebrow">Selected learner</p><h2>{learner?.full_name || 'No learner selected'}</h2></div></div>
      <form onSubmit={submit} className="note-form">
        <div className="segmented-control"><button type="button" className={noteType === 'typed' ? 'active' : ''} onClick={() => setNoteType('typed')}>Typed note</button><button type="button" className={noteType === 'voice' ? 'active' : ''} onClick={() => setNoteType('voice')}>Voice note</button></div>
        {noteType === 'voice' && <div className="voice-explainer"><span>For now, type the short note you would say aloud.</span></div>}
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`Add an observation about ${displayLearnerName(learner)}...`} rows={5} disabled={!learner} />
        <div className="form-footer"><small>{wordCount(text)} words</small><button className="primary-button" type="submit" disabled={loading || !learner}>Save observation</button></div>
      </form>
      <div className="observation-list"><h3>Recent observations</h3>{observations.length === 0 ? <p className="empty-state">No observations yet. Add one to start building this learner's classroom memory.</p> : observations.map((observation) => <article key={observation.id} className="observation-card"><p>{observation.cleaned_text || observation.original_text}</p><small>{new Date(observation.created_at).toLocaleString()}</small></article>)}</div>
    </section>
  );
}
