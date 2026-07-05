import { useState } from 'react';
import { UploadCloud, Loader } from 'lucide-react';
import { parseLearnerList } from './learnerListParser.js';

export default function LearnerListStep({ hasClass, hasLearners, loading, onAddLearner, onImportLearners }) {
  const [listText, setListText] = useState('');
  const [manualName, setManualName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const preview = parseLearnerList(listText);

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
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
            setListText(prev => prev + (prev ? '\n' : '') + data.text);
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
        setListText(prev => prev + (prev ? '\n' : '') + e.target.result);
        setIsUploading(false);
      };
      reader.readAsText(file);
    }
    
    event.target.value = '';
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
        <p className="empty-state" style={{ margin: 0 }}>
          Paste names, or upload a CSV, TXT, or PDF file.
        </p>
        <label style={{ cursor: (!hasClass || isUploading) ? 'not-allowed' : 'pointer', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', opacity: (!hasClass || isUploading) ? 0.5 : 1 }}>
          {isUploading ? <Loader size={18} className="spin-icon" /> : <UploadCloud size={18} />} 
          {isUploading ? 'Extracting...' : 'Upload File'}
          <input type="file" accept=".csv, .txt, .pdf, application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} disabled={!hasClass || isUploading} />
        </label>
      </div>

      <textarea 
        value={listText} 
        onChange={(event) => setListText(event.target.value)} 
        placeholder={isUploading ? 'Extracting text from file...' : 'Jackson Smith\nEmily Brown\nHenry Mokoena'} 
        disabled={!hasClass || isUploading} 
        rows={5}
      />
      
      {preview.length > 0 && (
        <div className="preview-box">
          <strong>{preview.length} learners found</strong>
          <small>{preview.slice(0, 8).join(', ')}{preview.length > 8 ? '...' : ''}</small>
        </div>
      )}
      
      <button className="primary-button" type="button" onClick={importList} disabled={!hasClass || loading || preview.length === 0 || isUploading}>
        {loading ? 'Importing...' : 'Import learner list'}
      </button>
      
      <form onSubmit={addManual} className="note-form compact-form">
        <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Or add one learner manually" disabled={!hasClass} />
        <button className="ghost-button" type="submit" disabled={!hasClass || loading || !manualName.trim()}>Add learner</button>
      </form>
    </article>
  );
}
