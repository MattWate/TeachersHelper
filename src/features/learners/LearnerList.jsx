export default function LearnerList({ activeClass, classes, learners, observations, selectedLearnerId, onSelectLearner, onSelectClass, onNavigateToSettings }) {
  const selectedLearner = learners.find(l => l.id === selectedLearnerId) || learners[0];
  
  // Don't calculate notes for 'auto'
  const noteCount = selectedLearner && selectedLearner.id !== 'auto' ? observations.filter(item => item.learner_id === selectedLearner.id).length : 0;

  return (
    <aside className="panel learner-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Class Workspace</p>
          <h2>{activeClass?.name || 'No active class'}</h2>
        </div>
      </div>
      
      {classes.length > 1 && (
        <div style={{ marginBottom: '12px' }}>
          <select className="select-input" value={activeClass?.id || ''} onChange={(event) => onSelectClass(event.target.value)}>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      )}

      <div className="learner-selection">
        <p className="eyebrow" style={{ marginBottom: '8px' }}>Select Learner</p>
        
        {learners.length === 0 ? (
          <div className="empty-state-container">
            <p className="empty-state" style={{ marginTop: 0, marginBottom: '16px' }}>
              Add learners to start capturing observations.
            </p>
            {onNavigateToSettings && (
              <button className="ghost-button" onClick={onNavigateToSettings} style={{ width: '100%' }}>
                Go to Settings to add learners
              </button>
            )}
          </div>
        ) : (
          <>
            <select 
              className="select-input" 
              value={selectedLearnerId || ''} 
              onChange={(event) => onSelectLearner(event.target.value)}
              style={{ marginBottom: '12px', cursor: 'pointer' }}
            >
              {learners.map((learner) => {
                const countStr = learner.id === 'auto' ? '' : ` (${observations.filter((item) => item.learner_id === learner.id).length} notes)`;
                return (
                  <option key={learner.id} value={learner.id}>
                    {learner.full_name}{countStr}
                  </option>
                );
              })}
            </select>

            {selectedLearner && (
              <div className="learner-item active" style={{ cursor: 'default' }}>
                <span>{selectedLearner.full_name}</span>
                {selectedLearner.id === 'auto' ? (
                  <small>Speeds up recording</small>
                ) : (
                  <small>{noteCount} notes</small>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
