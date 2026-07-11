import { useState } from 'react';
import { getInitials, getAvatarColor } from '../../shared/avatar.js';

export default function MemoryFeed({ observations, learners, activeLearnerId, loading, onReassignObservation }) {
  const [reassigningId, setReassigningId] = useState(null);

  const learnerById = new Map(learners.map((learner) => [learner.id, learner]));
  const visibleObservations = activeLearnerId === 'auto'
    ? observations
    : observations.filter((observation) => observation.learner_id === activeLearnerId);

  if (learners.length === 0) {
    return <p className="empty-state">Add learners in Settings to start capturing observations.</p>;
  }

  if (visibleObservations.length === 0) {
    return (
      <p className="empty-state">
        {activeLearnerId === 'auto'
          ? 'No observations yet. Tap the mic below to record your first one.'
          : `No observations yet for ${learnerById.get(activeLearnerId)?.full_name || 'this learner'}.`}
      </p>
    );
  }

  return (
    <div className="memory-feed">
      {visibleObservations.map((observation) => {
        const learner = learnerById.get(observation.learner_id);
        return (
          <article key={observation.id} className="feed-card">
            <span className="avatar-circle feed-avatar" style={{ background: getAvatarColor(observation.learner_id) }}>
              {getInitials(learner?.full_name || '?')}
            </span>
            <div className="feed-card-body">
              <div className="feed-card-head">
                <div>
                  <strong>{learner?.full_name || 'Unknown learner'}</strong>
                  <span className="feed-card-tag">{observation.category || 'General'}</span>
                </div>
                <button
                  type="button"
                  className="ghost-button feed-move-button"
                  onClick={() => setReassigningId(reassigningId === observation.id ? null : observation.id)}
                  disabled={loading}
                >
                  Move
                </button>
              </div>

              <p>{observation.cleaned_text || observation.original_text}</p>

              {reassigningId === observation.id ? (
                <div className="reassign-box">
                  <label>Move this note to:</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                      className="select-input"
                      style={{ minHeight: '40px', padding: '8px 12px', flex: '1 1 200px', margin: 0 }}
                      onChange={async (event) => {
                        if (event.target.value) {
                          setReassigningId(null);
                          await onReassignObservation({ observationId: observation.id, newLearnerId: event.target.value });
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select learner...</option>
                      {learners.map((learner_) => (
                        <option key={learner_.id} value={learner_.id} disabled={learner_.id === observation.learner_id}>
                          {learner_.full_name}
                        </option>
                      ))}
                    </select>
                    <button className="ghost-button" style={{ minHeight: '40px', padding: '8px 16px', background: 'white' }} onClick={() => setReassigningId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <small className="feed-card-time">{new Date(observation.created_at).toLocaleString()}</small>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
