import { useState, useEffect, useRef } from 'react';
import { displayLearnerName, wordCount } from '../../shared/dashboardModel.js';
import { Mic, Square } from 'lucide-react';

export default function ObservationCapture({ learner, classLearners = [], observations, loading, onSaveObservation }) {
  const [noteType, setNoteType] = useState('voice');
  const [text, setText] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob, mediaRecorder.mimeType);
      };

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
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        
        // 1. Send the audio AND the class list
        const response = await fetch('/.netlify/functions/process-voice', {
          method: 'POST',
          body: JSON.stringify({ 
            audioBase64: base64data, 
            mimeType: mimeType || 'audio/webm',
            learnerNames: classLearners.map(l => l.full_name) 
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.transcript) {
          
          // 2. MULTI-LEARNER / AUTO-ASSIGN LOGIC
          if (learner.id === 'auto') {
            // Find which IDs match the names the AI extracted
            const matchedLearners = classLearners.filter(l => (data.detectedNames || []).includes(l.full_name));
            
            if (matchedLearners.length === 0) {
              alert("No specific student names were detected in the audio. The transcript has been added to the text box for manual assignment.");
              setText(data.transcript);
              setNoteType('typed');
            } else {
              // Magic Multi-Save! Loop through and save a copy for EVERY child mentioned
              for (const matched of matchedLearners) {
                await onSaveObservation({
                  learnerId: matched.id, // Overrides 'auto'
                  observationType: 'voice',
                  text: data.transcript,
                  durationSeconds: Math.max(1, 20 - timeLeft)
                });
              }
              alert(`Successfully saved observation to: ${matchedLearners.map(m => m.full_name).join(', ')}`);
            }
          } else {
            // Standard single-learner save
            await onSaveObservation({ 
              observationType: 'voice', 
              text: data.transcript, 
              durationSeconds: Math.max(1, 20 - timeLeft)
            });
          }
        } else {
          alert(`Failed to transcribe: ${data.details || data.error || 'Unknown server error'}`);
        }
        setIsTranscribing(false);
      };
    } catch (error) {
      console.error("Transcription failed", error);
      alert("Failed to transcribe audio: Network or processing error.");
      setIsTranscribing(false);
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!learner || !text.trim() || learner.id === 'auto') return;
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
              <small>
                {learner.id === 'auto' 
                  ? "Speak your observation. The AI will automatically detect who you are talking about and save it to their profile." 
                  : `Speak your observation. It will be transcribed, tagged, and auto-saved to ${displayLearnerName(learner)}'s profile.`}
              </small>
            </div>
          </div>
        )}

        {noteType === 'typed' && (
          <>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`Add an observation about ${displayLearnerName(learner)}...`} rows={5} disabled={!learner} />
            <div className="form-footer">
              <small>{wordCount(text)} words</small>
              <button className="primary-button" type="submit" disabled={loading || !learner || learner.id === 'auto' || !text.trim()}>
                {learner.id === 'auto' ? 'Select a learner to type' : 'Save typed note'}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="observation-list">
        <h3>Recent observations</h3>
        {observations.length === 0 ? (
          <p className="empty-state">
            {learner?.id === 'auto' 
              ? "Select a specific learner from the list to view their observation history." 
              : "No observations yet. Add one to start building this learner's classroom memory."}
          </p>
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
