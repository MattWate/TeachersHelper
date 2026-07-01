import { useState } from 'react';
import { parseLearnerNames } from './learnerBatchParser.js';

export default function LearnerManager({ learners, loading, onAddLearners, onRemoveLearner }) {
  const [open, setOpen] = useState(false);
  const [namesText, setNamesText] = useState('');
  const names = parseLearnerNames(namesText);

  async function addNames() {
    if (!names.length) return;
    await onAddLearners(names);
    setNamesText('');
  }

  return (
    <section className="panel learner-manager">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Class list</p>
          <h2>Manage learners</h2>
        </div>
        <button className="ghost-button" type="button" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit list'}</button>
      </div>

      {!open ? <p className="empty-state">{learners.length} active learners in this class.</p> : (
        <div className="note-form">
          <textarea value={namesText} onChange={(event) => setNamesText(event.target.value)} placeholder={'Add learners, one per line\nNomsa Dlamini\nJames Patel\nEmily Brown'} />
          {names.length > 0 && <div className="preview-box"><strong>{names.length} learners ready to add</strong><small>{names.slice(0, 6).join(', ')}{names.length > 6 ? '...' : ''}</small></div>}
          <button className="primary-button" type="button" onClick={addNames} disabled={loading || names.length === 0}>{loading ? 'Adding...' : 'Add learners'}</button>

          <div className="learner-list management-list">
            {learners.map((learner) => <div className="learner-row" key={learner.id}><span>{learner.full_name}</span><button className="text-button danger-text" type="button" onClick={() => onRemoveLearner(learner.id)}>Remove</button></div>)}
          </div>
        </div>
      )}
    </section>
  );
}
