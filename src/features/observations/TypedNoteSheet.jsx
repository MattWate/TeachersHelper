import { useState } from 'react';
import { X } from 'lucide-react';
import { wordCount } from '../../shared/dashboardModel.js';

export default function TypedNoteSheet({ learner, loading, onSave, onClose }) {
  const [text, setText] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    await onSave({ observationType: 'typed', text: text.trim(), durationSeconds: 0 });
    setText('');
    onClose();
  }

  return (
    <div className="typed-note-overlay" onClick={onClose}>
      <form className="typed-note-sheet" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="typed-note-head">
          <p className="eyebrow">Typing for</p>
          <h3>{learner?.full_name}</h3>
          <button type="button" className="ghost-button typed-note-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={`Add an observation about ${learner?.full_name}...`}
          rows={5}
        />
        <div className="form-footer">
          <small>{wordCount(text)} words</small>
          <button className="primary-button" type="submit" disabled={loading || !text.trim()}>Save note</button>
        </div>
      </form>
    </div>
  );
}
