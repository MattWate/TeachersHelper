export default function LearnerList({ activeClass, classes, learners, observations, selectedLearnerId, onSelectLearner, onSelectClass }) {
  // Find the currently selected learner and their note count so we can highlight them
  const selectedLearner = learners.find(l => l.id === selectedLearnerId) || learners[0];
  const noteCount = selectedLearner ? observations.filter(item => item.learner_id === selectedLearner.id).length : 0;

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
          <p className="empty-state">Add learners to start capturing observations.</p>
        ) : (
          <>
            {/* The space-saving Dropdown */}
            <select 
              className="select-input" 
              value={selectedLearnerId || ''} 
              onChange={(event) => onSelectLearner(event.target.value)}
              style={{ marginBottom: '12px', cursor: 'pointer' }}
            >
              {learners.map((learner) => {
                const count = observations.filter((item) => item.learner_id === learner.id).length;
                return (
                  <option key={learner.id} value={learner.id}>
                    {learner.full_name} ({count} notes)
                  </option>
                );
              })}
            </select>

            {/* The Highlighted Selected Learner */}
            {selectedLearner && (
              <div className="learner-item active" style={{ cursor: 'default' }}>
                <span>{selectedLearner.full_name}</span>
                <small>{noteCount} notes</small>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
