import { useState } from 'react';
import { UploadCloud, Loader } from 'lucide-react';
import { parseLearnerNames } from './learnerBatchParser.js';

export default function LearnerManager({ learners, loading, onAddLearners, onRemoveLearner }) {
  const [userOpened, setUserOpened] = useState(false);
  const [namesText, setNamesText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const names = parseLearnerNames(namesText);

  // ALWAYS force the form open if the class is completely empty
  const isOpen = userOpened || learners.length === 0;

  async function addNames() {
    if (!names.length) return;
    
    // Safety catch: prevent silent failures if the prop wasn't passed down
    if (!onAddLearners) {
      alert("Error: The 'onAddLearners' function is missing from the parent component.");
      return;
    }

    await onAddLearners(names);
    setNamesText('');
    setUserOpened(false); // Close the manager after successful addition
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        try {
          const res = await fetch('/.netlify/functions/parse-document', {
            method: 'POST',
            body: JSON.stringify({ fileBase64: base64data, mimeType: file.type })
          });
          const data = await res.json();
          if (data.text) {
            setNamesText(prev => prev + (prev ? '\n' : '') + data.text);
          } else {
            alert(`Could not extract text: ${data.details || data.error}`);
          }
        } catch (e) {
          alert('Failed to connect to document parser.');
        } finally {
          setIsUploading(false);
        }
      };
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNamesText(prev => prev + (prev ? '\n' : '') + e.target.result);
        setIsUploading(false);
      };
      reader.readAsText(file);
    }
    
    event.target.value = '';
  }

  return (
    <section className="panel learner-manager">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Class list</p>
          <h2>Manage learners</h2>
        </div>
        {/* Only show the close/edit button if there are actually learners to hide */}
        {learners.length > 0 && (
          <button className="ghost-button" type="button" onClick={() => setUserOpened(!isOpen)}>
            {isOpen ? 'Close' : 'Edit list'}
          </button>
        )}
      </div>

      {!isOpen ? (
        <p className="empty-state">{learners.length} active learners in this class.</p>
      ) : (
        <div className="note-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <p className="empty-state" style={{ margin: 0 }}>
              Paste names, or upload a CSV, TXT, or PDF file.
            </p>
            <label style={{ cursor: isUploading ? 'not-allowed' : 'pointer', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', opacity: isUploading ? 0.5 : 1 }}>
              {isUploading ? <Loader size={18} className="spin-icon" /> : <UploadCloud size={18} />} 
              {isUploading ? 'Extracting...' : 'Upload File'}
              <input type="file" accept=".csv, .txt, .pdf, application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} disabled={isUploading} />
            </label>
          </div>

          <textarea 
            value={namesText} 
            onChange={(event) => setNamesText(event.target.value)} 
            placeholder={isUploading ? 'Extracting text from file...' : 'Add learners, one per line\nNomsa Dlamini\nJames Patel\nEmily Brown'} 
            rows={5}
            disabled={isUploading}
          />
          
          {names.length > 0 && (
            <div className="preview-box">
              <strong>{names.length} learners ready to add</strong>
              <small>{names.slice(0, 6).join(', ')}{names.length > 6 ? '...' : ''}</small>
            </div>
          )}
          
          <button className="primary-button" type="button" onClick={addNames} disabled={loading || names.length === 0 || isUploading}>
            {loading ? 'Adding...' : 'Add learners'}
          </button>

          {learners.length > 0 && (
            <>
              <hr style={{ border: 0, borderTop: '1px solid var(--outline)', margin: '24px 0' }} />
              <h3>Current Class List</h3>
              <div className="learner-list management-list">
                {learners.map((learner) => (
                  <div className="learner-row" key={learner.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--outline-strong)'}}>
                    <span>{learner.full_name}</span>
                    {onRemoveLearner && (
                      <button className="text-button danger-text" type="button" onClick={() => onRemoveLearner(learner.id)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
