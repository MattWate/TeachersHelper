import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, LogOut, Mic, Plus, Sparkles, Users } from 'lucide-react';
import { apiRequest, clearSession, loadSession, saveSession } from './lib/api.js';
import './styles.css';

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getPreferredName(learner) {
  return learner?.preferred_name || learner?.preferredName || learner?.full_name || learner?.fullName || 'this learner';
}

function mapDashboard(data) {
  return {
    profile: data.profile,
    classes: data.classes || [],
    learners: data.learners || [],
    observations: data.observations || [],
    reportStructures: data.reportStructures || [],
    usage: data.usage || { voice_note_count: 0, seconds_used: 0 },
  };
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [dashboard, setDashboard] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('typed');
  const [report, setReport] = useState(null);
  const [loginForm, setLoginForm] = useState({ fullName: '', email: '' });
  const [classForm, setClassForm] = useState({ name: '', grade: '', term: '' });
  const [learnerForm, setLearnerForm] = useState({ learnerName: '', preferredName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeClass = dashboard?.classes.find((item) => item.id === selectedClassId) || dashboard?.classes[0] || null;
  const activeClassId = activeClass?.id || null;
  const classLearners = dashboard?.learners.filter((learner) => learner.class_id === activeClassId) || [];
  const selectedLearner = classLearners.find((learner) => learner.id === selectedLearnerId) || classLearners[0] || null;
  const selectedLearnerResolvedId = selectedLearner?.id || null;
  const learnerObservations = dashboard?.observations.filter((observation) => observation.learner_id === selectedLearnerResolvedId) || [];

  const voiceLimit = 100;
  const voiceUsed = Number(dashboard?.usage?.voice_note_count || 0);
  const voiceRemaining = Math.max(voiceLimit - voiceUsed, 0);
  const usagePercentage = Math.round((voiceUsed / voiceLimit) * 100);

  useEffect(() => {
    if (!session?.email) return;
    refreshDashboard(session);
  }, []);

  useEffect(() => {
    if (!dashboard) return;

    if (!selectedClassId && dashboard.classes[0]) {
      setSelectedClassId(dashboard.classes[0].id);
    }

    const learnersForClass = dashboard.learners.filter((learner) => learner.class_id === (selectedClassId || dashboard.classes[0]?.id));
    if (!selectedLearnerId && learnersForClass[0]) {
      setSelectedLearnerId(learnersForClass[0].id);
    }
  }, [dashboard, selectedClassId, selectedLearnerId]);

  const classStats = useMemo(() => ({
    learners: classLearners.length,
    observations: dashboard?.observations.length || 0,
    voiceRemaining,
  }), [classLearners.length, dashboard?.observations.length, voiceRemaining]);

  async function refreshDashboard(currentSession = session) {
    if (!currentSession?.email) return;
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('bootstrap', currentSession);
      const mapped = mapDashboard(data);
      setDashboard(mapped);
      if (mapped.classes[0] && !selectedClassId) setSelectedClassId(mapped.classes[0].id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const nextSession = {
      fullName: loginForm.fullName.trim(),
      email: loginForm.email.trim().toLowerCase(),
    };

    if (!nextSession.email) {
      setError('Email is required for the tester POC.');
      return;
    }

    saveSession(nextSession);
    setSession(nextSession);
    await refreshDashboard(nextSession);
  }

  async function handleCreateClass(event) {
    event.preventDefault();
    if (!classForm.name.trim()) return;

    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('createClass', { ...session, ...classForm });
      const mapped = mapDashboard(data);
      setDashboard(mapped);
      setSelectedClassId(mapped.classes[mapped.classes.length - 1]?.id || mapped.classes[0]?.id || null);
      setClassForm({ name: '', grade: '', term: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLearner(event) {
    event.preventDefault();
    if (!activeClassId || !learnerForm.learnerName.trim()) return;

    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('createLearner', {
        ...session,
        classId: activeClassId,
        learnerName: learnerForm.learnerName.trim(),
        preferredName: learnerForm.preferredName.trim() || learnerForm.learnerName.trim(),
      });
      setDashboard(mapDashboard(data));
      setLearnerForm({ learnerName: '', preferredName: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function addObservation(event) {
    event.preventDefault();
    if (!selectedLearner || !noteText.trim()) return;

    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('addObservation', {
        ...session,
        classId: activeClassId,
        learnerId: selectedLearner.id,
        observationType: noteType,
        text: noteText.trim(),
        durationSeconds: noteType === 'voice' ? 20 : 0,
      });
      setDashboard(mapDashboard(data));
      setNoteText('');
      setReport(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    if (!selectedLearner) return;

    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('generateReport', {
        ...session,
        learnerId: selectedLearner.id,
      });
      setReport(data.draft);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setDashboard(null);
    setSelectedClassId(null);
    setSelectedLearnerId(null);
    setReport(null);
  }

  if (!session) {
    return (
      <main className="app-shell login-shell">
        <section className="hero login-hero">
          <div>
            <p className="eyebrow">Teacher's Little Helper tester POC</p>
            <h1>Start building a classroom memory.</h1>
            <p className="hero-copy">Use your email to create a tester profile. This POC saves your classes, learners and observations in Neon.</p>
          </div>
          <form className="login-card" onSubmit={handleLogin}>
            <label>
              Name
              <input value={loginForm.fullName} onChange={(event) => setLoginForm({ ...loginForm, fullName: event.target.value })} placeholder="Mrs Smith" />
            </label>
            <label>
              Email
              <input type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} placeholder="teacher@example.com" required />
            </label>
            {error && <p className="error-message">{error}</p>}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Starting...' : 'Start testing'}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Teacher's Little Helper tester POC</p>
          <h1>Capture learner moments now. Draft better reports later.</h1>
          <p className="hero-copy">Signed in as {session.email}. This version persists tester data in Neon, with simple email-based tester access.</p>
        </div>
        <div className="price-card">
          <span>Launch plan being tested</span>
          <strong>R89/month</strong>
          <small>100 voice observations per week. Unlimited typed notes.</small>
          <button className="ghost-button" onClick={handleLogout}><LogOut size={16} /> Switch tester</button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <section className="stats-grid">
        <StatCard icon={<Users />} label="Active class" value={activeClass?.name || 'No class yet'} detail={`${classStats.learners} learners`} />
        <StatCard icon={<ClipboardList />} label="Observations" value={classStats.observations} detail="Saved to Neon" />
        <StatCard icon={<Mic />} label="Voice notes left" value={classStats.voiceRemaining} detail={`${usagePercentage}% weekly allowance used`} />
      </section>

      <section className="setup-grid">
        <form className="panel setup-panel" onSubmit={handleCreateClass}>
          <div className="panel-header"><div><p className="eyebrow">Setup</p><h2>Add a class</h2></div></div>
          <input value={classForm.name} onChange={(event) => setClassForm({ ...classForm, name: event.target.value })} placeholder="Grade 3J" />
          <input value={classForm.grade} onChange={(event) => setClassForm({ ...classForm, grade: event.target.value })} placeholder="Grade 3" />
          <input value={classForm.term} onChange={(event) => setClassForm({ ...classForm, term: event.target.value })} placeholder="Term 2" />
          <button className="primary-button" type="submit" disabled={loading}><Plus size={16} /> Add class</button>
        </form>

        <form className="panel setup-panel" onSubmit={handleCreateLearner}>
          <div className="panel-header"><div><p className="eyebrow">Setup</p><h2>Add a learner</h2></div></div>
          <input value={learnerForm.learnerName} onChange={(event) => setLearnerForm({ ...learnerForm, learnerName: event.target.value })} placeholder="Full name" />
          <input value={learnerForm.preferredName} onChange={(event) => setLearnerForm({ ...learnerForm, preferredName: event.target.value })} placeholder="Preferred name" />
          <button className="primary-button" type="submit" disabled={loading || !activeClassId}><Plus size={16} /> Add learner</button>
        </form>
      </section>

      <section className="workspace">
        <aside className="panel learner-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Class</p>
              <h2>{activeClass?.name || 'Create a class'}</h2>
            </div>
          </div>

          {dashboard?.classes.length > 1 && (
            <select className="select-input" value={activeClassId || ''} onChange={(event) => { setSelectedClassId(event.target.value); setSelectedLearnerId(null); setReport(null); }}>
              {dashboard.classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
            </select>
          )}

          <div className="learner-list">
            {classLearners.length === 0 ? (
              <p className="empty-state">Add learners to start capturing observations.</p>
            ) : classLearners.map((learner) => {
              const count = dashboard.observations.filter((observation) => observation.learner_id === learner.id).length;
              return (
                <button
                  key={learner.id}
                  className={learner.id === selectedLearnerResolvedId ? 'learner-item active' : 'learner-item'}
                  onClick={() => { setSelectedLearnerId(learner.id); setReport(null); }}
                >
                  <span>{learner.full_name}</span>
                  <small>{count} notes</small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel capture-panel">
          <div className="panel-header"><div><p className="eyebrow">Selected learner</p><h2>{selectedLearner?.full_name || 'No learner selected'}</h2></div></div>

          <form onSubmit={addObservation} className="note-form">
            <div className="segmented-control" aria-label="Observation type">
              <button type="button" className={noteType === 'typed' ? 'active' : ''} onClick={() => setNoteType('typed')}>Typed note</button>
              <button type="button" className={noteType === 'voice' ? 'active' : ''} onClick={() => setNoteType('voice')}>Voice note mock</button>
            </div>

            {noteType === 'voice' && <div className="voice-explainer"><Mic size={18} /><span>Tester POC: paste what the 20-second voice note would say. Real recording comes in the mobile app.</span></div>}

            <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={`Add an observation about ${getPreferredName(selectedLearner)}...`} rows={5} disabled={!selectedLearner} />

            <div className="form-footer"><small>{wordCount(noteText)} words</small><button className="primary-button" type="submit" disabled={loading || !selectedLearner}>Save observation</button></div>
          </form>

          <div className="observation-list">
            <h3>Recent observations</h3>
            {learnerObservations.length === 0 ? <p className="empty-state">No observations yet. Add one to start building this learner's classroom memory.</p> : learnerObservations.map((observation) => (
              <article key={observation.id} className="observation-card">
                <div><strong>{observation.category || 'General'}</strong><span>{observation.sentiment || 'Observation'}</span></div>
                <p>{observation.cleaned_text || observation.original_text}</p>
                <small>{new Date(observation.created_at).toLocaleString()}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="panel report-panel">
          <div className="panel-header"><div><p className="eyebrow">Report draft</p><h2>Generate from observations</h2></div><button className="primary-button" onClick={generateReport} disabled={loading || !selectedLearner}><Sparkles size={16} /> Generate</button></div>

          {!report ? <div className="report-placeholder"><BookOpen size={32} /><p>Generate a draft to see how stored notes become report-ready language.</p></div> : (
            <div className="draft-output">
              <h3>{report.learnerName}</h3>
              {report.sections.map((section) => <article key={section.sectionName} className="draft-section"><h4>{section.sectionName}</h4><p>{section.text}</p><small>{wordCount(section.text)} words</small></article>)}
              {report.questions.length > 0 && <div className="teacher-prompts"><h4>Personal touch prompts</h4>{report.questions.map((question) => <p key={question}>{question}</p>)}</div>}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value, detail }) {
  return <article className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}
