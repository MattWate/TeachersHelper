import { useState } from 'react';
import { getClassLearners, getLearnerObservations } from '../../shared/dashboardModel.js';
import DashboardHero from './DashboardHero.jsx';
import StatsGrid from './StatsGrid.jsx';
import LearnerList from '../learners/LearnerList.jsx';
import LearnerManager from '../learners/LearnerManager.jsx';
import ObservationCapture from '../observations/ObservationCapture.jsx';
import ReportPanel from '../reports/ReportPanel.jsx';

export default function Dashboard({ session, dashboard, selectedClassId, selectedLearnerId, loading, error, onLogout, onSelectClass, onSelectLearner, onSaveObservation, onGenerateReport, onAddLearners, onRemoveLearner }) {
  const [currentTab, setCurrentTab] = useState('capture'); // 'capture', 'reports', 'settings'
  const [report, setReport] = useState(null);
  
  const activeClass = dashboard.classes.find((item) => item.id === selectedClassId) || dashboard.classes[0];
  const learners = getClassLearners(dashboard, activeClass?.id);
  const learner = learners.find((item) => item.id === selectedLearnerId) || learners[0];
  const observations = getLearnerObservations(dashboard, learner?.id);

  async function saveObservation(payload) {
    await onSaveObservation({ ...payload, classId: activeClass.id, learnerId: learner.id });
    setReport(null);
  }

  async function generateReport() {
    const draft = await onGenerateReport(learner.id);
    setReport(draft);
  }

  return (
    <main className="app-shell">
      {/* Mobile-Friendly Main Navigation */}
      <nav className="dashboard-nav segmented-control">
        <button className={currentTab === 'capture' ? 'active' : ''} onClick={() => setCurrentTab('capture')}>Capture Notes</button>
        <button className={currentTab === 'reports' ? 'active' : ''} onClick={() => setCurrentTab('reports')}>Draft Reports</button>
        <button className={currentTab === 'settings' ? 'active' : ''} onClick={() => setCurrentTab('settings')}>Settings</button>
      </nav>

      {error && <div className="error-banner">{error}</div>}

      {/* Settings Tab: Class Management & Stats */}
      {currentTab === 'settings' && (
        <div className="tab-content">
          <DashboardHero session={session} onLogout={onLogout} />
          <StatsGrid activeClass={activeClass} learnerCount={learners.length} observationCount={dashboard.observations.length} voiceUsed={dashboard.usage?.voice_note_count || 0} />
          <LearnerManager learners={learners} loading={loading} onAddLearners={onAddLearners} onRemoveLearner={onRemoveLearner} />
        </div>
      )}

      {/* Capture Tab: Focused purely on Learner selection and observation entry */}
      {currentTab === 'capture' && (
        <section className="workspace capture-workspace">
          <LearnerList activeClass={activeClass} classes={dashboard.classes} learners={learners} observations={dashboard.observations} selectedLearnerId={learner?.id} onSelectLearner={onSelectLearner} onSelectClass={onSelectClass} />
          <ObservationCapture learner={learner} observations={observations} loading={loading} onSaveObservation={saveObservation} />
        </section>
      )}

      {/* Reports Tab: Focused on generating and reviewing text */}
      {currentTab === 'reports' && (
        <section className="workspace reports-workspace">
          <LearnerList activeClass={activeClass} classes={dashboard.classes} learners={learners} observations={dashboard.observations} selectedLearnerId={learner?.id} onSelectLearner={onSelectLearner} onSelectClass={onSelectClass} />
          <ReportPanel learner={learner} report={report} loading={loading} onGenerateReport={generateReport} />
        </section>
      )}
    </main>
  );
}
