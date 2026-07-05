import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { parseLearnerNames } from './learnerBatchParser.js';

export default function LearnerManager({ learners, loading, onAddLearners, onRemoveLearner }) {
  const [open, setOpen] = useState(false);
  const [namesText, setNamesText] = useState('');
  const names = parseLearnerNames(namesText);

  async function addNames() {
    if (!names.length) return;
    await onAddLearners(names);
    setNamesText('');
    setOpen(false); // Close the manager after successful addition
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      // Append the new names to whatever might already be in the text box
      setNamesText(prev => prev + (prev ? '\n' : '') + e.target.result);
    };
    reader.readAsText(file);
    
    // Clear the input so the same file can be uploaded again if needed
    event.target.value = '';
  }

  return (
    <section className="panel learner-manager">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Class list</p>
          <h2>Manage learners</h2>
        </div>
        <button className="ghost-button" type="button" onClick={() => setOpen(!open)}>
          {open ? 'Close' : 'Edit list'}
        </button>
      </div>

      {!open ? (
        <p className="empty-state">{learners.length} active learners in this class.</p>
      ) : (
        <div className="note-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <p className="empty-state" style={{ margin: 0 }}>
              Paste names from Word/Excel, or upload a CSV file.
            </p>
            <label style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UploadCloud size={18} /> Upload CSV/TXT
              <input type="file" accept=".csv, .txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <textarea 
            value={namesText} 
            onChange={(event) => setNamesText(event.target.value)} 
            placeholder={'Add learners, one per line\nNomsa Dlamini\nJames Patel\nEmily Brown'} 
            rows={5}
          />
          
          {names.length > 0 && (
            <div className="preview-box">
              <strong>{names.length} learners ready to add</strong>
              <small>{names.slice(0, 6).join(', ')}{names.length > 6 ? '...' : ''}</small>
            </div>
          )}
          
          <button className="primary-button" type="button" onClick={addNames} disabled={loading || names.length === 0}>
            {loading ? 'Adding...' : 'Add learners'}
          </button>

          <hr style={{ border: 0, borderTop: '1px solid var(--outline)', margin: '24px 0' }} />

          <h3>Current Class List</h3>
          <div className="learner-list management-list">
            {learners.length === 0 && <p className="empty-state">No learners in this class yet.</p>}
            {learners.map((learner) => (
              <div className="learner-row" key={learner.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--outline-strong)'}}>
                <span>{learner.full_name}</span>
                <button className="text-button danger-text" type="button" onClick={() => onRemoveLearner(learner.id)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
