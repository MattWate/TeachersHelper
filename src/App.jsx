import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, Mic, RefreshCcw, Sparkles, Users } from 'lucide-react';
import { classifyObservation, generateLearnerReport } from './lib/reportGenerator.js';
import { loadState, resetState, saveState } from './lib/storage.js';

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [selectedLearnerId, setSelectedLearnerId] = useState(state.learners[0]?.id ?? null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('typed');
  const [report, setReport] = useState(null);

  const selectedClass = state.classes[0];
  const selectedLearner = state.learners.find((learner) => learner.id === selectedLearnerId);
  const learnerObservations = state.observations.filter((observation) => observation.learnerId === selectedLearnerId);

  const usagePercentage = Math.round((state.teacher.voiceNotesUsedThisWeek / state.teacher.voiceNoteWeeklyLimit) * 100);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const classStats = useMemo(() => {
    return {
      learners: state.learners.length,
      observations: state.observations.length,
      voiceRemaining: state.teacher.voiceNoteWeeklyLimit - state.teacher.voiceNotesUsedThisWeek,
    };
  }, [state]);

  function addObservation(event) {
    event.preventDefault();

    if (!selectedLearner || !noteText.trim()) return;

    if (noteType === 'voice' && state.teacher.voiceNotesUsedThisWeek >= state.teacher.voiceNoteWeeklyLimit) {
      alert('This teacher has reached the weekly voice observation limit for the POC. Typed notes are still unlimited.');
      return;
    }

    const classification = classifyObservation(noteText);

    const observation = {
      id: `obs-${crypto.randomUUID()}`,
      learnerId: selectedLearner.id,
      classId: selectedClass.id,
      type: noteType,
      text: noteText.trim(),
      category: classification.category,
      sentiment: classification.sentiment,
      createdAt: new Date().toISOString(),
      usedInReport: false,
    };

    setState((current) => ({
      ...current,
      teacher: {
        ...current.teacher,
        voiceNotesUsedThisWeek: noteType === 'voice' ? current.teacher.voiceNotesUsedThisWeek + 1 : current.teacher.voiceNotesUsedThisWeek,
      },
      observations: [observation, ...current.observations],
    }));

    setNoteText('');
    setReport(null);
  }

  function generateReport() {
    if (!selectedLearner) return;
    const draft = generateLearnerReport({
      learner: selectedLearner,
      observations: state.observations,
      reportStructure: state.reportStructure,
    });
    setReport(draft);
  }

  function handleReset() {
    const freshState = resetState();
    setState(freshState);
    setSelectedLearnerId(freshState.learners[0]?.id ?? null);
    setReport(null);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Teacher's Little Helper POC</p>
          <h1>Capture learner moments now. Draft better reports later.</h1>
          <p className="hero-copy">
            This proof of concept tests the core loop: class setup, learner observations, voice-note limits, AI-style tagging and report drafting.
          </p>
        </div>
        <div className="price-card">
          <span>Launch plan</span>
          <strong>R89/month</strong>
          <small>100 voice observations per week. Unlimited typed notes.</small>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard icon={<Users />} label="Active class" value={selectedClass.name} detail={`${classStats.learners} learners`} />
        <StatCard icon={<ClipboardList />} label="Observations" value={classStats.observations} detail="Saved this POC session" />
        <StatCard icon={<Mic />} label="Voice notes left" value={classStats.voiceRemaining} detail={`${usagePercentage}% weekly allowance used`} />
      </section>

      <section className="workspace">
        <aside className="panel learner-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Class</p>
              <h2>{selectedClass.name}</h2>
            </div>
            <button className="ghost-button" onClick={handleReset} title="Reset demo data">
              <RefreshCcw size={16} /> Reset
            </button>
          </div>

          <div className="learner-list">
            {state.learners.map((learner) => {
              const count = state.observations.filter((observation) => observation.learnerId === learner.id).length;
              return (
                <button
                  key={learner.id}
                  className={learner.id === selectedLearnerId ? 'learner-item active' : 'learner-item'}
                  onClick={() => {
                    setSelectedLearnerId(learner.id);
                    setReport(null);
                  }}
                >
                  <span>{learner.fullName}</span>
                  <small>{count} notes</small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel capture-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Selected learner</p>
              <h2>{selectedLearner?.fullName}</h2>
            </div>
          </div>

          <form onSubmit={addObservation} className="note-form">
            <div className="segmented-control" aria-label="Observation type">
              <button type="button" className={noteType === 'typed' ? 'active' : ''} onClick={() => setNoteType('typed')}>
                Typed note
              </button>
              <button type="button" className={noteType === 'voice' ? 'active' : ''} onClick={() => setNoteType('voice')}>
                Voice note mock
              </button>
            </div>

            {noteType === 'voice' && (
              <div className="voice-explainer">
                <Mic size={18} />
                <span>POC mock: paste what the 20-second voice note would transcribe. Real recording comes in the mobile app.</span>
              </div>
            )}

            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder={`Add an observation about ${selectedLearner?.preferredName ?? 'this learner'}...`}
              rows={5}
            />

            <div className="form-footer">
              <small>{wordCount(noteText)} words</small>
              <button className="primary-button" type="submit">Save observation</button>
            </div>
          </form>

          <div className="observation-list">
            <h3>Recent observations</h3>
            {learnerObservations.length === 0 ? (
              <p className="empty-state">No observations yet. Add one to start building this learner's classroom memory.</p>
            ) : (
              learnerObservations.map((observation) => (
                <article key={observation.id} className="observation-card">
                  <div>
                    <strong>{observation.category}</strong>
                    <span>{observation.sentiment}</span>
                  </div>
                  <p>{observation.text}</p>
                  <small>{new Date(observation.createdAt).toLocaleString()}</small>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel report-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Report draft</p>
              <h2>Generate from observations</h2>
            </div>
            <button className="primary-button" onClick={generateReport}>
              <Sparkles size={16} /> Generate
            </button>
          </div>

          <div className="report-structure">
            <h3>Current structure</h3>
            {state.reportStructure.sections.map((section) => (
              <div key={section.id} className="structure-row">
                <span>{section.name}</span>
                <small>{section.minWords}-{section.maxWords} words</small>
              </div>
            ))}
          </div>

          {!report ? (
            <div className="report-placeholder">
              <BookOpen size={32} />
              <p>Generate a draft to see how stored notes become report-ready language.</p>
            </div>
          ) : (
            <div className="draft-output">
              <h3>{report.learnerName}</h3>
              {report.sections.map((section) => (
                <article key={section.sectionName} className="draft-section">
                  <h4>{section.sectionName}</h4>
                  <p>{section.text}</p>
                  <small>{wordCount(section.text)} words</small>
                </article>
              ))}

              {report.questions.length > 0 && (
                <div className="teacher-prompts">
                  <h4>Personal touch prompts</h4>
                  {report.questions.map((question) => <p key={question}>{question}</p>)}
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value, detail }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
