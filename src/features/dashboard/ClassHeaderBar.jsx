import { Settings } from 'lucide-react';

export default function ClassHeaderBar({ activeClass, classes, onSelectClass, onNavigateToSettings }) {
  return (
    <div className="class-header-bar">
      <div>
        <p className="eyebrow">Class</p>
        {classes.length > 1 ? (
          <select className="select-input class-header-select" value={activeClass?.id || ''} onChange={(event) => onSelectClass(event.target.value)}>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        ) : (
          <h2>{activeClass?.name || 'No active class'}</h2>
        )}
      </div>
      <button type="button" className="ghost-button class-header-settings" onClick={onNavigateToSettings} aria-label="Settings">
        <Settings size={18} />
      </button>
    </div>
  );
}
