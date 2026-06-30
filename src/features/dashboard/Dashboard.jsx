import { useState } from 'react';
import { getClassLearners, getLearnerObservations } from '../../shared/dashboardModel.js';
import DashboardHero from './DashboardHero.jsx';
import StatsGrid from './StatsGrid.jsx';
import LearnerList from '../learners/LearnerList.jsx';
import ObservationCapture from '../observations/ObservationCapture.jsx';
import ReportPanel from '../reports/ReportPanel.jsx';

export default function Dashboard({ session, dashboard, selectedClassId, selectedLearnerId, loading, error, onLogout, onSelectClass, onSelectLearner, onSaveObservation, onGenerateReport }) {
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
      <DashboardHero session={session} onLogout={onLogout} />
      {error && <div className="error-banner">{error}</div>}
      <StatsGrid activeClass={activeClass} learnerCount={learners.length} observationCount={dashboard.observations.length} voiceUsed={dashboard.usage?.voice_note_count || 0} />
      <section className="workspace">
        <LearnerList activeClass={activeClass} classes={dashboard.classes} learners={learners} observations={dashboard.observations} selectedLearnerId={learner?.id} onSelectLearner={onSelectLearner} onSelectClass={onSelectClass} />
        <ObservationCapture learner={learner} observations={observations} loading={loading} onSaveObservation={saveObservation} />
        <ReportPanel learner={learner} report={report} loading={loading} onGenerateReport={generateReport} />
      </section>
    </main>
  );
}
