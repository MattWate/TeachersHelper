import { useState } from 'react';
import { UploadCloud, Loader } from 'lucide-react';
import { extractMarks } from './marksApi.js';

export default function MarksUploadPanel({ learners, onExtracted }) {
  const [periodLabel, setPeriodLabel] = useState('');
  const [term, setTerm] = useState('');
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setError('');

    try {
      const learnerNames = learners.map((learner) => learner.full_name);
      const extractedLearners = await extractMarks({ file, learnerNames });
      onExtracted({
        extractedLearners,
        meta: { periodLabel, term, academicYear, fileName: file.name },
      });
    } catch (err) {
      setError(err.message || 'Could not extract marks from that file.');
    } finally {
      setIsExtracting(false);
      event.target.value = '';
    }
  }

  return (
    <article className="panel step-card">
      <p className="eyebrow">Marks upload</p>
      <h2>Upload a class mark sheet</h2>
      <p className="empty-state">
        Upload one CSV, XLSX, or PDF with marks for the whole class. We'll match each row to a learner and let you
        confirm before anything is saved.
      </p>

      <div className="note-form" style={{ marginBottom: '16px' }}>
        <label>
          Reporting period
          <input value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} placeholder="e.g. Term 2 assessments" disabled={isExtracting} />
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ flex: 1 }}>
            Term
            <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Term 2" disabled={isExtracting} />
          </label>
          <label style={{ flex: 1 }}>
            Academic year
            <input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} disabled={isExtracting} />
          </label>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <label style={{ cursor: isExtracting ? 'not-allowed' : 'pointer', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', opacity: isExtracting ? 0.5 : 1 }}>
        {isExtracting ? <Loader size={18} className="spin-icon" /> : <UploadCloud size={18} />}
        {isExtracting ? 'Reading marks...' : 'Upload CSV, XLSX or PDF'}
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          disabled={isExtracting}
        />
      </label>
    </article>
  );
}
