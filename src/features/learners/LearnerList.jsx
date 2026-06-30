export default function LearnerList({ activeClass, classes, learners, observations, selectedLearnerId, onSelectLearner, onSelectClass }) {
  return (
    <aside className="panel learner-panel">
      <div className="panel-header"><div><p className="eyebrow">Class</p><h2>{activeClass?.name}</h2></div></div>
      {classes.length > 1 && <select className="select-input" value={activeClass?.id || ''} onChange={(event) => onSelectClass(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      <div className="learner-list">
        {learners.map((learner) => {
          const count = observations.filter((item) => item.learner_id === learner.id).length;
          return <button key={learner.id} className={learner.id === selectedLearnerId ? 'learner-item active' : 'learner-item'} onClick={() => onSelectLearner(learner.id)}><span>{learner.full_name}</span><small>{count} notes</small></button>;
        })}
      </div>
    </aside>
  );
}
