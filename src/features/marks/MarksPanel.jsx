import { useState } from 'react';
import MarksUploadPanel from './MarksUploadPanel.jsx';
import MarksConfirmTable from './MarksConfirmTable.jsx';

export default function MarksPanel({ learners, marks, loading, onSaveMarks }) {
  const [pendingExtraction, setPendingExtraction] = useState(null);

  async function handleSave(payload) {
    await onSaveMarks(payload);
    setPendingExtraction(null);
  }

  const marksByLearner = learners.map((learner) => ({
    learner,
    entries: marks.filter((mark) => mark.learner_id === learner.id),
  }));

  return (
    <div className="tab-content">
      {!pendingExtraction && (
        <MarksUploadPanel
          learners={learners}
          onExtracted={({ extractedLearners, meta }) => setPendingExtraction({ extractedLearners, meta })}
        />
      )}

      {pendingExtraction && (
        <MarksConfirmTable
          extractedLearners={pendingExtraction.extractedLearners}
          meta={pendingExtraction.meta}
          learners={learners}
          loading={loading}
          onSave={handleSave}
          onCancel={() => setPendingExtraction(null)}
        />
      )}

      <article className="panel step-card" style={{ marginTop: '16px' }}>
        <p className="eyebrow">Saved marks</p>
        <h2>Marks on file for this class</h2>
        {marks.length === 0 ? (
          <p className="empty-state">No marks saved yet. Upload a mark sheet above to get started.</p>
        ) : (
          <div className="learner-list management-list">
            {marksByLearner.filter((row) => row.entries.length > 0).map(({ learner, entries }) => (
              <div key={learner.id} className="learner-row" style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--outline-strong)' }}>
                <strong>{learner.full_name}</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  {entries.map((entry) => (
                    <small key={entry.id}>
                      {entry.subject}: {entry.mark_display}{entry.period_label ? ` (${entry.period_label})` : ''}
                    </small>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
