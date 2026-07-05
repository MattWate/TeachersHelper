import { useEffect, useState } from 'react';
import SignIn from '../features/auth/SignIn.jsx';
import OnboardingFlow from '../features/onboarding/OnboardingFlow.jsx';
import Dashboard from '../features/dashboard/Dashboard.jsx';
import { authClient } from '../features/auth/authClient.js';
import { apiRequest } from '../lib/api.js';
import { getClassLearners, mapDashboard } from '../shared/dashboardModel.js';
import '../styles.css';
import '../onboarding.css';

const appSession = (user) => ({ authUserId: user?.id, fullName: user?.name || user?.email?.split('@')[0] || '', email: user?.email || '' });

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeClass = dashboard?.classes.find((item) => item.id === selectedClassId) || dashboard?.classes[0] || null;
  const learners = getClassLearners(dashboard, activeClass?.id);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => {
    if (!dashboard) return;
    const nextClassId = selectedClassId || dashboard.classes[0]?.id || null;
    if (!selectedClassId && nextClassId) setSelectedClassId(nextClassId);
    const firstLearner = dashboard.learners.find((learner) => learner.class_id === nextClassId && learner.active !== false);
    if (!selectedLearnerId && firstLearner) setSelectedLearnerId(firstLearner.id);
  }, [dashboard, selectedClassId, selectedLearnerId]);

  async function loadWorkspace(currentSession) {
    if (!currentSession?.email) return;
    const data = await apiRequest('bootstrap', currentSession);
    setDashboard(mapDashboard(data));
  }

  async function checkAuth() {
    setChecking(true);
    setError('');
    try {
      const result = await authClient.getSession();
      const user = result.data?.user;
      if (result.data?.session && user) {
        const next = appSession(user);
        setSession(next);
        await loadWorkspace(next);
      }
    } catch (err) { setError(err.message || 'Could not check sign-in status.'); }
    finally { setChecking(false); }
  }

  async function handleSignIn(form) {
    if (!form.email || !form.password) return setError('Please enter your email address and password.');
    setLoading(true);
    setError('');
    try {
      const result = form.mode === 'create'
        ? await authClient.signUp.email({ name: form.fullName || form.email.split('@')[0], email: form.email, password: form.password })
        : await authClient.signIn.email({ email: form.email, password: form.password });
      if (result.error) throw new Error(result.error.message || 'Authentication failed.');
      const current = await authClient.getSession();
      const user = current.data?.user;
      if (!current.data?.session || !user) throw new Error('Could not open your session.');
      const next = appSession(user);
      setSession(next);
      await loadWorkspace(next);
    } catch (err) { setError(err.message || 'Could not sign in.'); }
    finally { setLoading(false); }
  }

  async function logout() {
    await authClient.signOut();
    setSession(null);
    setDashboard(null);
    setSelectedClassId(null);
    setSelectedLearnerId(null);
  }

  async function run(action, payload = {}) {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(action, { ...session, ...payload });
      if (data.classes) setDashboard(mapDashboard(data));
      return data;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  }

  async function createClass(name) {
    const data = await run('createClass', { name });
    if (data?.classes?.[0]) setSelectedClassId(data.classes[0].id);
  }

  async function addLearner(learnerName) {
    if (!activeClass?.id) return;
    await run('createLearner', { classId: activeClass.id, learnerName, preferredName: learnerName });
  }

  // The fast bulk endpoint we made
  async function addLearners(names) { 
    if (!activeClass?.id || !names?.length) return;
    await run('createLearners', { classId: activeClass.id, names }); 
  }

  // FIX: Make sure the Onboarding Flow uses the fast bulk endpoint too!
  async function importLearners(names) { 
    await addLearners(names); 
  }

  async function removeLearner(learnerId) {
    if (!window.confirm('Remove this learner from the active class list? Their saved observations will be kept.')) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/.netlify/functions/remove-learner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, learnerId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error) throw new Error(result.error || 'Could not remove learner.');
      if (learnerId === selectedLearnerId) setSelectedLearnerId(null);
      await loadWorkspace(session);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function saveObservation(payload) { await run('addObservation', payload); }
  
  // Accepts the bundled options and passes them straight to the API
  async function generateReport(options) { 
    const data = await run('generateReport', options); 
    return data?.draft || null; 
  }
  
  if (checking) return <main className="app-shell"><div className="report-placeholder">Checking your sign-in...</div></main>;
  if (!session) return <SignIn onSignIn={handleSignIn} loading={loading} error={error} />;
  
  // NEW: Catch backend errors during load instead of hanging forever
  if (error && !dashboard) return (
    <main className="app-shell login-shell">
      <div className="error-banner" style={{ padding: '32px', textAlign: 'center', maxWidth: '400px' }}>
        <h3 style={{ marginTop: 0 }}>Workspace failed to load</h3>
        <p>{error}</p>
        <button className="ghost-button" onClick={logout} style={{ marginTop: '24px', width: '100%' }}>Sign out & try again</button>
      </div>
    </main>
  );

  if (!dashboard) return <main className="app-shell"><div className="report-placeholder">Opening your workspace...</div></main>;
  
  return <Dashboard session={session} dashboard={dashboard} selectedClassId={activeClass?.id} selectedLearnerId={selectedLearnerId} loading={loading} error={error} onLogout={logout} onSelectClass={setSelectedClassId} onSelectLearner={setSelectedLearnerId} onSaveObservation={saveObservation} onGenerateReport={generateReport} onAddLearners={addLearners} onRemoveLearner={removeLearner} />;
}
