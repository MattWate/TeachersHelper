import { useState } from 'react';
import { parseLearnerList } from './learnerListParser.js';

export default function LearnerListStep({ hasClass, hasLearners, loading, onAddLearner, onImportLearners }) {
  const [listText, setListText] = useState('');
  const [manualName, setManualName] = useState('');
  const preview = parseLearnerList(listText);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (file) setListText(await file.text());
  }

  async function importList() {
    if (!preview.length) return;
    await onImportLearners(preview.slice(0, 50));
    setListText('');
  }

  async function addManual(event) {
    event.preventDefault();
    if (!manualName.trim()) return;
    await onAddLearner(manualName.trim());
    setManualName('');
  }

  return (
    <article className={hasLearners ? 'panel step-card complete' : 'panel step-card'}>
      <div className="step-number">2</div>
      <p className="eyebrow">Learners</p>
      <h2>Build your learner list</h2>
      <p className="empty-state">Paste names one per line, upload a simple file, or add learners manually.</p>
      <input type="file" accept=".txt,.csv" onChange={handleFile} disabled={!hasClass} />
      <textarea value={listText} onChange={(event) => setListText(event.target.value)} placeholder={'Jackson Smith\nEmily Brown\nHenry Mokoena'} disabled={!hasClass} />
      {preview.length > 0 && <div className="preview-box"><strong>{preview.length} learners found</strong><small>{preview.slice(0, 8).join(', ')}{preview.length > 8 ? '...' : ''}</small></div>}
      <button className="primary-button" type="button" onClick={importList} disabled={!hasClass || loading || preview.length === 0}>{loading ? 'Importing...' : 'Import learner list'}</button>
      <form onSubmit={addManual} className="note-form compact-form">
        <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Or add one learner manually" disabled={!hasClass} />
        <button className="ghost-button" type="submit" disabled={!hasClass || loading || !manualName.trim()}>Add learner</button>
      </form>
    </article>
  );
}
