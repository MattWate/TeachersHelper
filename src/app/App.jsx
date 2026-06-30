import { useEffect, useState } from 'react';
import SignIn from '../features/auth/SignIn.jsx';
import OnboardingFlow from '../features/onboarding/OnboardingFlow.jsx';
import Dashboard from '../features/dashboard/Dashboard.jsx';
import { apiRequest, clearSession, loadSession, saveSession } from '../lib/api.js';
import { getClassLearners, mapDashboard } from '../shared/dashboardModel.js';
import '../styles.css';
import '../onboarding.css';

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [dashboard, setDashboard] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeClass = dashboard?.classes.find((item) => item.id === selectedClassId) || dashboard?.classes[0] || null;
  const learners = getClassLearners(dashboard, activeClass?.id);
  const hasClass = Boolean(dashboard?.classes.length);
  const hasLearners = learners.length > 0;

  useEffect(() => {
    if (session?.email) refresh(session);
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    const nextClassId = selectedClassId || dashboard.classes[0]?.id || null;
    if (!selectedClassId && nextClassId) setSelectedClassId(nextClassId);
    const firstLearner = dashboard.learners.find((learner) => learner.class_id === nextClassId);
    if (!selectedLearnerId && firstLearner) setSelectedLearnerId(firstLearner.id);
  }, [dashboard, selectedClassId, selectedLearnerId]);

  async function refresh(currentSession = session) {
    if (!currentSession?.email) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('bootstrap', currentSession);
      setDashboard(mapDashboard(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(nextSession) {
    if (!nextSession.email) {
      setError('Please enter your email address.');
      return;
    }
    saveSession(nextSession);
    setSession(nextSession);
    await refresh(nextSession);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setDashboard(null);
    setSelectedClassId(null);
    setSelectedLearnerId(null);
  }

  async function createClass(name) {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('createClass', { ...session, name });
      const mapped = mapDashboard(data);
      setDashboard(mapped);
      setSelectedClassId(mapped.classes[0]?.id || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addLearner(learnerName) {
    if (!activeClass?.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('createLearner', { ...session, classId: activeClass.id, learnerName, preferredName: learnerName });
      setDashboard(mapDashboard(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function importLearners(names) {
    for (const name of names) await addLearner(name);
  }

  async function saveObservation(payload) {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('addObservation', { ...session, ...payload });
      setDashboard(mapDashboard(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport(learnerId) {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('generateReport', { ...session, learnerId });
      return data.draft;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  if (!session) return <SignIn onSignIn={handleSignIn} loading={loading} error={error} />;
  if (!dashboard) return <main className="app-shell"><div className="report-placeholder">Opening your workspace...</div></main>;

  if (!hasClass || !hasLearners) {
    return <OnboardingFlow session={session} hasClass={hasClass} hasLearners={hasLearners} loading={loading} error={error} onLogout={handleLogout} onCreateClass={createClass} onAddLearner={addLearner} onImportLearners={importLearners} />;
  }

  return <Dashboard session={session} dashboard={dashboard} selectedClassId={activeClass?.id} selectedLearnerId={selectedLearnerId} loading={loading} error={error} onLogout={handleLogout} onSelectClass={setSelectedClassId} onSelectLearner={setSelectedLearnerId} onSaveObservation={saveObservation} onGenerateReport={generateReport} />;
}
