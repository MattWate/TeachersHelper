import { useState } from 'react';
import { getClassLearners, getLearnerObservations } from '../../shared/dashboardModel.js';
import DashboardHero from './DashboardHero.jsx';
import StatsGrid from './StatsGrid.jsx';
import LearnerList from '../learners/LearnerList.jsx';
import LearnerManager from '../learners/LearnerManager.jsx';
import ObservationCapture from '../observations/ObservationCapture.jsx';
import ReportPanel from '../reports/ReportPanel.jsx';

export default function Dashboard({ session, dashboard, selectedClassId, selectedLearnerId, loading, error, onLogout, onSelectClass, onSelectLearner, onSaveObservation, onGenerateReport, onAddLearners, onRemoveLearner, onReassignObservation }) {
  const [currentTab, setCurrentTab] = useState('capture');
  const [report, setReport] = useState(null);
  
  const activeClass = dashboard.classes.find((item) => item.id === selectedClassId) || dashboard.classes[0];
  const realLearners = getClassLearners(dashboard, activeClass?.id);
  
  // NEW: Create an Auto-Detect pseudo-learner at the very top of the list!
  const autoDetectLearner = { id: 'auto', full_name: '✨ Auto-Detect Learner (Quick Record)' };
  const learnersWithAuto = realLearners.length > 0 ? [autoDetectLearner, ...realLearners] : [];
  
  // Default to Auto-Detect
  const learner = learnersWithAuto.find((item) => item.id === selectedLearnerId) || learnersWithAuto[0];
  const observations = learner?.id === 'auto' ? [] : getLearnerObservations(dashboard, learner?.id);

  async function saveObservation(payload) {
    // If the auto-assigner passes a learnerId in the payload, it overrides the 'auto' id
    await onSaveObservation({ classId: activeClass.id, learnerId: learner.id, ...payload });
    setReport(null);
  }

  async function generateReport(options) {
    const draft = await onGenerateReport({ learnerId: learner.id, ...options });
    setReport(draft);
  }

  return (
    <main className="app-shell">
      <nav className="dashboard-nav segmented-control">
        <button className={currentTab === 'capture' ? 'active' : ''} onClick={() => setCurrentTab('capture')}>Capture Notes</button>
        <button className={currentTab === 'reports' ? 'active' : ''} onClick={() => setCurrentTab('reports')}>Draft Reports</button>
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
        <section className="workspace capture-workspace">
          <LearnerList 
            activeClass={activeClass} 
            classes={dashboard.classes} 
            learners={learnersWithAuto} 
            observations={dashboard.observations} 
            selectedLearnerId={learner?.id} 
            onSelectLearner={onSelectLearner} 
            onSelectClass={onSelectClass}
            onNavigateToSettings={() => setCurrentTab('settings')} 
          />
          {/* Note: We pass 'realLearners' so the transcription API gets the real names */}
          <ObservationCapture learner={learner} classLearners={realLearners} observations={observations} loading={loading} onSaveObservation={saveObservation} onReassignObservation={onReassignObservation} />
        </section>
      )}

      {currentTab === 'reports' && (
        <section className="workspace reports-workspace">
          <LearnerList 
            activeClass={activeClass} 
            classes={dashboard.classes} 
            learners={realLearners} // Hide auto-detect from the reports tab
            observations={dashboard.observations} 
            selectedLearnerId={learner?.id === 'auto' ? realLearners[0]?.id : learner?.id} 
            onSelectLearner={onSelectLearner} 
            onSelectClass={onSelectClass}
            onNavigateToSettings={() => setCurrentTab('settings')}
          />
          <ReportPanel learner={learner?.id === 'auto' ? realLearners[0] : learner} report={report} loading={loading} onGenerateReport={generateReport} />
        </section>
      )}
    </main>
  );
}
