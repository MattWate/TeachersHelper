import { useState, useEffect, useRef } from 'react';
import { displayLearnerName, wordCount } from '../../shared/dashboardModel.js';
import { Mic, Square } from 'lucide-react';

export default function ObservationCapture({ learner, observations, loading, onSaveObservation }) {
  const [noteType, setNoteType] = useState('typed');
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef(null);

  function startRecording() {
    setIsRecording(true);
    setTimeLeft(20);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRecording() {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // Cleanup timer if component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!learner || !text.trim()) return;
    
    // Stop recording immediately if they hit save early
    stopRecording(); 
    
    await onSaveObservation({ 
      observationType: noteType, 
      text: text.trim(), 
      durationSeconds: noteType === 'voice' ? (20 - timeLeft) || 20 : 0 
    });
    
    setText('');
    setTimeLeft(20);
  }

  return (
    <section className="panel capture-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Selected learner</p>
          <h2>{learner?.full_name || 'No learner selected'}</h2>
        </div>
      </div>
      
      <form onSubmit={submit} className="note-form">
        <div className="segmented-control">
          <button type="button" className={noteType === 'typed' ? 'active' : ''} onClick={() => setNoteType('typed')}>Type it</button>
          <button type="button" className={noteType === 'voice' ? 'active' : ''} onClick={() => setNoteType('voice')}>Record voice</button>
        </div>

        {noteType === 'voice' && (
          <div className="voice-recorder-container">
            {!isRecording ? (
              <button type="button" className="record-button" onClick={startRecording}>
                <Mic size={32} />
                <span>Tap to record</span>
              </button>
            ) : (
              <div className="recording-active">
                <div className="timer">00:{timeLeft.toString().padStart(2, '0')}</div>
                <button type="button" className="stop-button" onClick={stopRecording}>
                  <Square size={20} />
                  <span>Stop recording</span>
                </button>
                <span className="pulse-indicator">Recording in progress...</span>
              </div>
            )}
            <div className="voice-explainer">
              <small>Phase 1 Tester: Use the button above to simulate the flow. For now, type or dictate via your phone keyboard into the box below so the AI can tag it.</small>
            </div>
          </div>
        )}

        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`Add an observation about ${displayLearnerName(learner)}...`} rows={5} disabled={!learner} />
        
        <div className="form-footer">
          <small>{wordCount(text)} words</small>
          <button className="primary-button" type="submit" disabled={loading || !learner || (noteType === 'voice' && isRecording)}>Save observation</button>
        </div>
      </form>

      <div className="observation-list">
        <h3>Recent observations</h3>
        {observations.length === 0 ? (
          <p className="empty-state">No observations yet. Add one to start building this learner's classroom memory.</p>
        ) : (
          observations.map((observation) => (
            <article key={observation.id} className="observation-card">
              <p>{observation.cleaned_text || observation.original_text}</p>
              <small>{new Date(observation.created_at).toLocaleString()}</small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
