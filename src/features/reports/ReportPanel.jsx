import { useState } from 'react';
import { BookOpen, Sparkles, ClipboardList, ChevronUp } from 'lucide-react';
import { wordCount } from '../../shared/dashboardModel.js';
import MarksUploadPanel from '../marks/MarksUploadPanel.jsx';
import MarksConfirmTable from '../marks/MarksConfirmTable.jsx';

export default function ReportPanel({ learner, classLearners = [], learnerMarks = [], report, loading, onGenerateReport, onSaveMarks }) {
  const [timeframe, setTimeframe] = useState('End of Term Report');
  const [contextMarks, setContextMarks] = useState('');
  const [marksTool, setMarksTool] = useState(null); // null | 'upload' | { extractedLearners, meta }
  const [savingMarks, setSavingMarks] = useState(false);

  function handleGenerate() {
    onGenerateReport({ timeframe, contextMarks });
  }

  async function handleSaveMarks(payload) {
    setSavingMarks(true);
    try {
      await onSaveMarks(payload);
      setMarksTool(null);
    } finally {
      setSavingMarks(false);
    }
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
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} disabled={loading} className="select-input" style={{ marginBottom: '12px' }}>
            <option value="End of Term Report">End of Term Report</option>
            <option value="Monthly Progress Update">Monthly Progress Update</option>
            <option value="Weekly Feedback">Weekly Feedback</option>
            <option value="Incident / Pastoral Note">Incident / Pastoral Note</option>
          </select>
        </label>

        <label>
          Focus & additional context (Optional)
          <textarea
            value={contextMarks}
            onChange={(e) => setContextMarks(e.target.value)}
            placeholder="e.g. Focus this report on Maths progress and classroom behaviour..."
            rows={3}
            disabled={loading}
          />
        </label>

        <div className="marks-inline-tool">
          <div className="marks-summary-row">
            <div>
              <strong>Marks on file for {learner?.full_name || 'this learner'}</strong>
              {learnerMarks.length === 0 ? (
                <p className="empty-state" style={{ margin: '4px 0 0' }}>No marks saved yet — add some so they're included in the report.</p>
              ) : (
                <div className="mark-chip-row">
                  {learnerMarks.map((mark) => (
                    <small key={mark.id} className="mark-chip">{mark.subject}: {mark.mark_display}</small>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setMarksTool(marksTool ? null : 'upload')}
              disabled={loading}
            >
              {marksTool ? <><ChevronUp size={16} /> Close</> : <><ClipboardList size={16} /> Add / update marks</>}
            </button>
          </div>

          {marksTool === 'upload' && (
            <MarksUploadPanel
              learners={classLearners}
              onExtracted={({ extractedLearners, meta }) => setMarksTool({ extractedLearners, meta })}
            />
          )}

          {marksTool && marksTool !== 'upload' && (
            <MarksConfirmTable
              extractedLearners={marksTool.extractedLearners}
              meta={marksTool.meta}
              learners={classLearners}
              loading={savingMarks}
              onSave={handleSaveMarks}
              onCancel={() => setMarksTool(null)}
            />
          )}
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
