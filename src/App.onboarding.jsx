import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, LogOut, Mic, Plus, Sparkles, Upload, Users } from 'lucide-react';
import { apiRequest, clearSession, loadSession, saveSession } from './lib/api.js';
import './styles.css';

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function displayName(learner) {
  return learner?.preferred_name || learner?.full_name || 'this learner';
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

function parseLearnerList(text) {
  return text
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean)
    .filter((line) => !['name', 'full name', 'learner', 'learners', 'student', 'students'].includes(line.toLowerCase()))
    .filter((line, index, list) => list.findIndex((item) => item.toLowerCase() === line.toLowerCase()) === index);
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
  const [className, setClassName] = useState('');
  const [learnerForm, setLearnerForm] = useState({ learnerName: '', preferredName: '' });
  const [learnerListText, setLearnerListText] = useState('');
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeClass = dashboard?.classes.find((item) => item.id === selectedClassId) || dashboard?.classes[0] || null;
  const activeClassId = activeClass?.id || null;
  const classLearners = dashboard?.learners.filter((learner) => learner.class_id === activeClassId) || [];
  const selectedLearner = classLearners.find((learner) => learner.id === selectedLearnerId) || classLearners[0] || null;
  const selectedLearnerIdResolved = selectedLearner?.id || null;
  const learnerObservations = dashboard?.observations.filter((observation) => observation.learner_id === selectedLearnerIdResolved) || [];
  const learnerPreview = parseLearnerList(learnerListText);

  const voiceLimit = 100;
  const voiceUsed = Number(dashboard?.usage?.voice_note_count || 0);
  const voiceRemaining = Math.max(voiceLimit - voiceUsed, 0);
  const usagePercentage = Math.round((voiceUsed / voiceLimit) * 100);
  const hasClass = Boolean(dashboard?.classes?.length);
  const hasLearners = Boolean(classLearners.length);

  useEffect(() => {
    if (session?.email) refreshDashboard(session);
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    const nextClassId = selectedClassId || dashboard.classes[0]?.id || null;
    if (!selectedClassId && nextClassId) setSelectedClassId(nextClassId);
    const learnersForClass = dashboard.learners.filter((learner) => learner.class_id === nextClassId);
    if (!selectedLearnerId && learnersForClass[0]) setSelectedLearnerId(learnersForClass[0].id);
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
    const nextSession = { fullName: loginForm.fullName.trim(), email: loginForm.email.trim().toLowerCase() };
    if (!nextSession.email) {
      setError('Please enter your email address.');
      return;
    }
    saveSession(nextSession);
    setSession(nextSession);
    await refreshDashboard(nextSession);
  }

  async function handleCreateClass(event) {
    event.preventDefault();
    if (!className.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('createClass', { ...session, name: className.trim() });
      const mapped = mapDashboard(data);
      setDashboard(mapped);
      setSelectedClassId(mapped.classes[mapped.classes.length - 1]?.id || mapped.classes[0]?.id || null);
      setClassName('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function createLearner({ learnerName, preferredName }) {
    const data = await apiRequest('createLearner', {
      ...session,
      classId: activeClassId,
      learnerName,
      preferredName: preferredName || learnerName,
    });
    setDashboard(mapDashboard(data));
    return data;
  }

  async function handleCreateLearner(event) {
    event.preventDefault();
    if (!activeClassId || !learnerForm.learnerName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createLearner({ learnerName: learnerForm.learnerName.trim(), preferredName: learnerForm.preferredName.trim() });
      setLearnerForm({ learnerName: '', preferredName: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImportLearners() {
    if (!activeClassId || learnerPreview.length === 0) return;
    setImporting(true);
    setError('');
    try {
      let latest = null;
      for (const name of learnerPreview.slice(0, 50)) {
        latest = await apiRequest('createLearner', { ...session, classId: activeClassId, learnerName: name, preferredName: name });
      }
      if (latest) setDashboard(mapDashboard(latest));
      setLearnerListText('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setLearnerListText(text);
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
      const data = await apiRequest('generateReport', { ...session, learnerId: selectedLearner.id });
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
            <p className="eyebrow">Teacher's Little Helper</p>
            <h1>Make report writing feel less rushed.</h1>
            <p className="hero-copy">Capture classroom observations as they happen, then use them to draft warmer, more specific learner reports when report season arrives.</p>
          </div>
          <form className="login-card" onSubmit={handleLogin}>
            <div><p className="eyebrow">Get started</p><h2>Open your workspace</h2></div>
            <label>Name<input value={loginForm.fullName} onChange={(event) => setLoginForm({ ...loginForm, fullName: event.target.value })} placeholder="Mrs Smith" /></label>
            <label>Email<input type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} placeholder="teacher@example.com" required /></label>
            {error && <p className="error-message">{error}</p>}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Opening...' : 'Open workspace'}</button>
          </form>
        </section>
      </main>
    );
  }

  if (dashboard && (!hasClass || !hasLearners)) {
    return (
      <main className="app-shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Let's get you started</p>
            <h1>Set up your first class.</h1>
            <p className="hero-copy">Create a class, add your learners, then start capturing the small observations that make reports more personal.</p>
          </div>
          <div className="price-card">
            <span>Your workspace</span>
            <strong>{session.fullName || 'Welcome'}</strong>
            <small>{session.email}</small>
            <button className="ghost-button" onClick={handleLogout}><LogOut size={16} /> Switch user</button>
          </div>
        </section>
        {error && <div className="error-banner">{error}</div>}
        <section className="onboarding-grid">
          <article className={hasClass ? 'panel step-card complete' : 'panel step-card'}>
            <div className="step-number">1</div>
            <p className="eyebrow">Class</p>
            <h2>Name your class</h2>
            <p className="empty-state">Use whatever name you naturally use at school, such as Grade 3J or English Group A.</p>
            <form onSubmit={handleCreateClass} className="note-form">
              <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Grade 3J" disabled={hasClass} />
              <button className="primary-button" type="submit" disabled={loading || hasClass}>{hasClass ? 'Class created' : 'Create class'}</button>
            </form>
          </article>
          <article className={hasLearners ? 'panel step-card complete' : 'panel step-card'}>
            <div className="step-number">2</div>
            <p className="eyebrow">Learners</p>
            <h2>Build your learner list</h2>
            <p className="empty-state">Paste names, one per line, or upload a simple CSV/text file. You can also add learners manually.</p>
            <input type="file" accept=".txt,.csv" onChange={handleFileUpload} disabled={!hasClass} />
            <textarea value={learnerListText} onChange={(event) => setLearnerListText(event.target.value)} placeholder={'Jackson Smith\nEmily Brown\nHenry Mokoena'} disabled={!hasClass} />
            {learnerPreview.length > 0 && <div className="preview-box"><strong>{learnerPreview.length} learners found</strong><small>{learnerPreview.slice(0, 8).join(', ')}{learnerPreview.length > 8 ? '...' : ''}</small></div>}
            <button className="primary-button" type="button" onClick={handleImportLearners} disabled={!hasClass || importing || learnerPreview.length === 0}><Upload size={16} /> {importing ? 'Importing...' : 'Import learner list'}</button>
            <form onSubmit={handleCreateLearner} className="note-form compact-form">
              <input value={learnerForm.learnerName} onChange={(event) => setLearnerForm({ ...learnerForm, learnerName: event.target.value })} placeholder="Or add one learner manually" disabled={!hasClass} />
              <button className="ghost-button" type="submit" disabled={!hasClass || loading || !learnerForm.learnerName.trim()}><Plus size={16} /> Add learner</button>
            </form>
          </article>
          <article className="panel step-card">
            <div className="step-number">3</div>
            <p className="eyebrow">Ready</p>
            <h2>Start capturing moments</h2>
            <p className="empty-state">Once your learners are added, your dashboard will open automatically.</p>
            <button className="primary-button" type="button" disabled={!hasClass || !hasLearners}>Open dashboard</button>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Teacher's Little Helper</p>
          <h1>Capture learner moments now. Draft better reports later.</h1>
          <p className="hero-copy">Build a useful memory of each learner through quick notes, then turn those observations into thoughtful report drafts.</p>
        </div>
        <div className="price-card">
          <span>Your workspace</span><strong>{session.fullName || 'Welcome'}</strong><small>{session.email}</small>
          <button className="ghost-button" onClick={handleLogout}><LogOut size={16} /> Switch user</button>
        </div>
      </section>
      {error && <div className="error-banner">{error}</div>}
      <section className="stats-grid">
        <StatCard icon={<Users />} label="Active class" value={activeClass?.name || 'No class yet'} detail={`${classStats.learners} learners`} />
        <StatCard icon={<ClipboardList />} label="Observations" value={classStats.observations} detail="Saved observations" />
        <StatCard icon={<Mic />} label="Voice notes left" value={classStats.voiceRemaining} detail={`${usagePercentage}% weekly allowance used`} />
      </section>
      <section className="workspace">
        <aside className="panel learner-panel">
          <div className="panel-header"><div><p className="eyebrow">Class</p><h2>{activeClass?.name || 'Create a class'}</h2></div></div>
          {dashboard?.classes.length > 1 && <select className="select-input" value={activeClassId || ''} onChange={(event) => { setSelectedClassId(event.target.value); setSelectedLearnerId(null); setReport(null); }}>{dashboard.classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</select>}
          <div className="learner-list">{classLearners.map((learner) => { const count = dashboard.observations.filter((observation) => observation.learner_id === learner.id).length; return <button key={learner.id} className={learner.id === selectedLearnerIdResolved ? 'learner-item active' : 'learner-item'} onClick={() => { setSelectedLearnerId(learner.id); setReport(null); }}><span>{learner.full_name}</span><small>{count} notes</small></button>; })}</div>
        </aside>
        <section className="panel capture-panel">
          <div className="panel-header"><div><p className="eyebrow">Selected learner</p><h2>{selectedLearner?.full_name || 'No learner selected'}</h2></div></div>
          <form onSubmit={addObservation} className="note-form">
            <div className="segmented-control" aria-label="Observation type"><button type="button" className={noteType === 'typed' ? 'active' : ''} onClick={() => setNoteType('typed')}>Typed note</button><button type="button" className={noteType === 'voice' ? 'active' : ''} onClick={() => setNoteType('voice')}>Voice note</button></div>
            {noteType === 'voice' && <div className="voice-explainer"><Mic size={18} /><span>For now, type what you would say in a quick voice note. Real recording will be added in the mobile app.</span></div>}
            <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={`Add an observation about ${displayName(selectedLearner)}...`} rows={5} disabled={!selectedLearner} />
            <div className="form-footer"><small>{wordCount(noteText)} words</small><button className="primary-button" type="submit" disabled={loading || !selectedLearner}>Save observation</button></div>
          </form>
          <div className="observation-list"><h3>Recent observations</h3>{learnerObservations.length === 0 ? <p className="empty-state">No observations yet. Add one to start building this learner's classroom memory.</p> : learnerObservations.map((observation) => <article key={observation.id} className="observation-card"><div><strong>{observation.category || 'General'}</strong><span>{observation.sentiment || 'Observation'}</span></div><p>{observation.cleaned_text || observation.original_text}</p><small>{new Date(observation.created_at).toLocaleString()}</small></article>)}</div>
        </section>
        <section className="panel report-panel">
          <div className="panel-header"><div><p className="eyebrow">Report draft</p><h2>Generate from observations</h2></div><button className="primary-button" onClick={generateReport} disabled={loading || !selectedLearner}><Sparkles size={16} /> Generate</button></div>
          {!report ? <div className="report-placeholder"><BookOpen size={32} /><p>Generate a draft to see how stored notes become report-ready language.</p></div> : <div className="draft-output"><h3>{report.learnerName}</h3>{report.sections.map((section) => <article key={section.sectionName} className="draft-section"><h4>{section.sectionName}</h4><p>{section.text}</p><small>{wordCount(section.text)} words</small></article>)}{report.questions.length > 0 && <div className="teacher-prompts"><h4>Personal touch prompts</h4>{report.questions.map((question) => <p key={question}>{question}</p>)}</div>}</div>}
        </section>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value, detail }) {
  return <article className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}
