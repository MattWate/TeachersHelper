import { useState } from 'react';
import { matchLearnerName } from './matchLearnerNames.js';

function buildInitialRows(extractedLearners, learners) {
  return extractedLearners.map((entry) => {
    const match = matchLearnerName(entry.extractedName, learners);
    return {
      extractedName: entry.extractedName,
      learnerId: match?.learnerId || '',
      confidence: match?.confidence || 0,
      included: true,
      subjects: entry.subjects.map((subject) => ({
        subject: subject.subject,
        markDisplay: subject.markDisplay,
        markValue: subject.markValue ?? '',
        outOf: subject.outOf ?? '',
      })),
    };
  });
}

export default function MarksConfirmTable({ extractedLearners, learners, meta, loading, onSave, onCancel }) {
  const [rows, setRows] = useState(() => buildInitialRows(extractedLearners, learners));

  function updateRow(index, changes) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  function updateSubject(rowIndex, subjectIndex, changes) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        const subjects = row.subjects.map((subject, j) => (j === subjectIndex ? { ...subject, ...changes } : subject));
        return { ...row, subjects };
      })
    );
  }

  function handleSave() {
    const marks = [];
    rows.forEach((row) => {
      if (!row.included || !row.learnerId) return;
      row.subjects.forEach((subject) => {
        if (!subject.subject) return;
        marks.push({
          learnerId: row.learnerId,
          subject: subject.subject,
          markDisplay: subject.markDisplay,
          markValue: subject.markValue === '' ? null : Number(subject.markValue),
          outOf: subject.outOf === '' ? null : Number(subject.outOf),
        });
      });
    });
    onSave({ ...meta, marks });
  }

  const unmatchedCount = rows.filter((row) => row.included && !row.learnerId).length;
  const readyCount = rows.filter((row) => row.included && row.learnerId).length;

  return (
    <article className="panel step-card">
      <p className="eyebrow">Confirm before saving</p>
      <h2>Match each row to a learner</h2>
      <p className="empty-state">
        {readyCount} of {rows.length} rows matched to a learner.
        {unmatchedCount > 0 ? ` ${unmatchedCount} need a manual match, or uncheck them to skip.` : ''}
      </p>

      <div className="learner-list management-list" style={{ marginBottom: '16px' }}>
        {rows.map((row, rowIndex) => (
          <div key={`${row.extractedName}-${rowIndex}`} className="learner-row" style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--outline-strong)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
              <input type="checkbox" checked={row.included} onChange={(event) => updateRow(rowIndex, { included: event.target.checked })} />
              <strong style={{ minWidth: '160px' }}>{row.extractedName}</strong>
              <select
                className="select-input"
                value={row.learnerId}
                onChange={(event) => updateRow(rowIndex, { learnerId: event.target.value })}
                disabled={!row.included}
              >
                <option value="">Not matched — choose a learner</option>
                {learners.map((learner) => (
                  <option key={learner.id} value={learner.id}>{learner.full_name}</option>
                ))}
              </select>
              {row.learnerId && row.confidence > 0 && row.confidence < 0.85 && (
                <small style={{ color: 'var(--secondary)' }}>Check this match</small>
              )}
            </div>

            {row.included && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '28px' }}>
                {row.subjects.map((subject, subjectIndex) => (
                  <div key={subject.subject + subjectIndex} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      value={subject.subject}
                      onChange={(event) => updateSubject(rowIndex, subjectIndex, { subject: event.target.value })}
                      style={{ width: '110px' }}
                    />
                    <input
                      value={subject.markDisplay}
                      onChange={(event) => updateSubject(rowIndex, subjectIndex, { markDisplay: event.target.value })}
                      style={{ width: '70px' }}
                      placeholder="mark"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="primary-button" type="button" onClick={handleSave} disabled={loading || readyCount === 0}>
          {loading ? 'Saving...' : `Save marks for ${readyCount} learner${readyCount === 1 ? '' : 's'}`}
        </button>
        <button className="ghost-button" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
      </div>
    </article>
  );
}
