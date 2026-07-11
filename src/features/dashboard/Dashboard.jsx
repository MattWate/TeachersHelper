import { useState } from 'react';
import { getClassLearners, getLearnerMarks } from '../../shared/dashboardModel.js';
import DashboardHero from './DashboardHero.jsx';
import StatsGrid from './StatsGrid.jsx';
import ClassHeaderBar from './ClassHeaderBar.jsx';
import LearnerList from '../learners/LearnerList.jsx';
import LearnerManager from '../learners/LearnerManager.jsx';
import ObservationCapture from '../observations/ObservationCapture.jsx';
import ReportPanel from '../reports/ReportPanel.jsx';
import MarksPanel from '../marks/MarksPanel.jsx';

export default function Dashboard({ session, dashboard, selectedClassId, selectedLearnerId, loading, error, onLogout, onSelectClass, onSelectLearner, onSaveObservation, onGenerateReport, onAddLearners, onRemoveLearner, onReassignObservation, onSaveMarks }) {
  const [currentTab, setCurrentTab] = useState('capture');
  const [report, setReport] = useState(null);

  const activeClass = dashboard.classes.find((item) => item.id === selectedClassId) || dashboard.classes[0];
  const realLearners = getClassLearners(dashboard, activeClass?.id);

  // Capture tab: 'auto' is a valid selection (global auto-detect), not a real learner id.
  const activeLearnerId = selectedLearnerId || 'auto';

  // Reports tab always needs a concrete learner — falls back to the first real one.
  const reportLearner = realLearners.find((item) => item.id === selectedLearnerId) || realLearners[0];
  const reportLearnerMarks = reportLearner ? getLearnerMarks(dashboard, reportLearner.id) : [];

  async function saveObservation(payload) {
    await onSaveObservation({ classId: activeClass.id, ...payload });
    setReport(null);
  }

  async function generateReport(options) {
    const draft = await onGenerateReport({ learnerId: reportLearner.id, ...options });
    setReport(draft);
    return draft;
  }

  return (
    <main className="app-shell">
      <nav className="dashboard-nav segmented-control">
        <button className={currentTab === 'capture' ? 'active' : ''} onClick={() => setCurrentTab('capture')}>Capture Notes</button>
        <button className={currentTab === 'reports' ? 'active' : ''} onClick={() => setCurrentTab('reports')}>Draft Reports</button>
        <button className={currentTab === 'marks' ? 'active' : ''} onClick={() => setCurrentTab('marks')}>Marks</button>
        <button className={currentTab === 'settings' ? 'active' : ''} onClick={() => setCurrentTab('settings')}>Settings</button>
      </nav>

      {error && <div className="error-banner">{error}</div>}

      {currentTab === 'settings' && (
        <div className="tab-content">
          <DashboardHero session={session} onLogout={onLogout} />
          <StatsGrid activeClass={activeClass} learnerCount={realLearners.length} observationCount={dashboard.observations.length} voiceUsed={dashboard.usage?.voice_note_count || 0} />
          <LearnerManager learners={realLearners} loading={loading} onAddLearners={onAddLearners} onRemoveLearner={onRemoveLearner} />
        </div>
      )}

      {currentTab === 'capture' && (
        <section className="capture-page">
          <ClassHeaderBar
            activeClass={activeClass}
            classes={dashboard.classes}
            onSelectClass={onSelectClass}
            onNavigateToSettings={() => setCurrentTab('settings')}
          />
          <ObservationCapture
            activeLearnerId={activeLearnerId}
            onSelectLearner={onSelectLearner}
            learners={realLearners}
            observations={dashboard.observations}
            loading={loading}
            onSaveObservation={saveObservation}
            onReassignObservation={onReassignObservation}
          />
        </section>
      )}

      {currentTab === 'marks' && (
        <MarksPanel learners={realLearners} marks={dashboard.marks} loading={loading} onSaveMarks={onSaveMarks} />
      )}

      {currentTab === 'reports' && (
        <section className="workspace reports-workspace">
          <LearnerList
            activeClass={activeClass}
            classes={dashboard.classes}
            learners={realLearners}
            observations={dashboard.observations}
            selectedLearnerId={reportLearner?.id}
            onSelectLearner={onSelectLearner}
            onSelectClass={onSelectClass}
            onNavigateToSettings={() => setCurrentTab('settings')}
          />
          <ReportPanel
            learner={reportLearner}
            classLearners={realLearners}
            learnerMarks={reportLearnerMarks}
            report={report}
            loading={loading}
            onGenerateReport={generateReport}
            onSaveMarks={onSaveMarks}
          />
        </section>
      )}
    </main>
  );
}
