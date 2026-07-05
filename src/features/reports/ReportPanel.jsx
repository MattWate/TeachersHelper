import { useState } from 'react';
import { BookOpen, Sparkles, UploadCloud } from 'lucide-react';
import { wordCount } from '../../shared/dashboardModel.js';

export default function ReportPanel({ learner, report, loading, onGenerateReport }) {
  const [timeframe, setTimeframe] = useState('End of Term Report');
  const [contextMarks, setContextMarks] = useState('');

  function handleGenerate() {
    onGenerateReport({ timeframe, contextMarks });
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Read the uploaded CSV or text file and append it to the context box
    const reader = new FileReader();
    reader.onload = (e) => {
      setContextMarks(prev => prev + (prev ? '\n\n' : '') + `--- Uploaded Data from ${file.name} ---\n` + e.target.result);
    };
    reader.readAsText(file);
  }

  return (
    <section className="panel report-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Report draft</p>
          <h2>Generate from observations</h2>
        </div>
        <button className="primary-button" onClick={handleGenerate} disabled={loading || !learner}>
          <Sparkles size={16} /> {loading ? 'Drafting report...' : 'Generate'}
        </button>
      </div>

      <div className="note-form" style={{ marginBottom: '24px' }}>
        <label>
          Report Type
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} disabled={loading}>
            <option value="End of Term Report">End of Term Report</option>
            <option value="Monthly Progress Update">Monthly Progress Update</option>
            <option value="Weekly Feedback">Weekly Feedback</option>
            <option value="Incident / Pastoral Note">Incident / Pastoral Note</option>
          </select>
        </label>

        <label>
          Marks & Additional Context (Optional)
          <textarea 
            value={contextMarks} 
            onChange={(e) => setContextMarks(e.target.value)} 
            placeholder="Paste marks, grades, or specific focus areas here..." 
            rows={3}
            disabled={loading}
          />
        </label>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UploadCloud size={16} /> Upload CSV/Text marks
            <input type="file" accept=".csv, .txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {!report ? (
        <div className="report-placeholder">
          <BookOpen size={32} />
          <p>Generate a draft to see how stored notes and marks become report-ready language.</p>
        </div>
      ) : (
        <div className="draft-output">
          <h3>{report.learnerName} - {report.timeframe || timeframe}</h3>
          
          {report.sections.map((section) => (
            <article key={section.sectionName} className="draft-section">
              <h4>{section.sectionName}</h4>
              <p>{section.text}</p>
              <small>{wordCount(section.text)} words</small>
            </article>
          ))}

          {report.questions && report.questions.length > 0 && (
            <div className="teacher-prompts">
              <h4 style={{ color: 'var(--secondary)', marginBottom: '8px' }}>
                This report could be more meaningful if there were more notes about {report.learnerName}. Keep making notes!
              </h4>
              {report.questions.map((question) => <p key={question}>• {question}</p>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
