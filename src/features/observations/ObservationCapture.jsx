import { useState, useEffect, useRef } from 'react';
import { displayLearnerName, wordCount } from '../../shared/dashboardModel.js';
import { Mic, Square } from 'lucide-react';

export default function ObservationCapture({ learner, observations, loading, onSaveObservation }) {
  const [noteType, setNoteType] = useState('typed');
  const [text, setText] = useState('');
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  async function startRecording() {
    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 2. Collect audio data as it streams
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      // 3. When recording stops, process the audio
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        // Release the microphone light in the browser
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob, mediaRecorder.mimeType);
      };

      // 4. Start the recording and the 20s countdown timer
      mediaRecorder.start();
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
    } catch (err) {
      alert("Could not access microphone. Please check your browser permissions.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function processAudio(audioBlob, mimeType) {
    setIsTranscribing(true);
    try {
      // Convert Blob to Base64 for Netlify/Gemini
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        
        const response = await fetch('/.netlify/functions/process-voice', {
          method: 'POST',
          body: JSON.stringify({ audioBase64: base64data, mimeType: mimeType || 'audio/webm' })
        });
        const data = await response.json();
        
        if (data.transcript) {
          // Auto-save immediately upon successful transcription
          await onSaveObservation({ 
            observationType: 'voice', 
            text: data.transcript, 
            durationSeconds: 20 - timeLeft || 20 
          });
        } else {
          alert("Could not transcribe the audio. Please try again.");
        }
        setIsTranscribing(false);
      };
    } catch (error) {
      console.error("Transcription failed", error);
      alert("Failed to transcribe audio.");
      setIsTranscribing(false);
    }
  }

  // Cleanup timer if component unmounts
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!learner || !text.trim()) return;
    await onSaveObservation({ observationType: 'typed', text: text.trim(), durationSeconds: 0 });
    setText('');
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
            {!isRecording && !isTranscribing ? (
              <button type="button" className="record-button" onClick={startRecording}>
                <Mic size={32} />
                <span>Tap to record</span>
              </button>
            ) : isRecording ? (
              <div className="recording-active">
                <div className="timer">00:{timeLeft.toString().padStart(2, '0')}</div>
                <button type="button" className="stop-button" onClick={stopRecording}>
                  <Square size={20} />
                  <span>Stop recording</span>
                </button>
                <span className="pulse-indicator">Recording in progress...</span>
              </div>
            ) : (
              <div className="recording-active">
                <div className="timer">...</div>
                <span className="pulse-indicator" style={{ color: 'var(--primary)' }}>Transcribing audio with AI...</span>
              </div>
            )}
            <div className="voice-explainer">
              <small>Speak your observation. It will be transcribed, tagged, and auto-saved to {displayLearnerName(learner)}'s profile.</small>
            </div>
          </div>
        )}

        {noteType === 'typed' && (
          <>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`Add an observation about ${displayLearnerName(learner)}...`} rows={5} disabled={!learner} />
            <div className="form-footer">
              <small>{wordCount(text)} words</small>
              <button className="primary-button" type="submit" disabled={loading || !learner || !text.trim()}>Save typed note</button>
            </div>
          </>
        )}
      </form>

      <div className="observation-list">
        <h3>Recent observations</h3>
        {observations.length === 0 ? (
          <p className="empty-state">No observations yet. Add one to start building this learner's classroom memory.</p>
        ) : (
          observations.map((observation) => (
            <article key={observation.id} className="observation-card">
              <div>
                <strong>{observation.category || 'General'}</strong>
                <span>{observation.sentiment || 'Observation'}</span>
              </div>
              <p>{observation.cleaned_text || observation.original_text}</p>
              <small>{new Date(observation.created_at).toLocaleString()}</small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
