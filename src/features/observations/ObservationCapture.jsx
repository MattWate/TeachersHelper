import { useState } from 'react';
import { useVoiceRecorder } from './useVoiceRecorder.js';
import CaptureDock from './CaptureDock.jsx';
import MemoryFeed from './MemoryFeed.jsx';
import TypedNoteSheet from './TypedNoteSheet.jsx';

export default function ObservationCapture({
  activeLearnerId,
  onSelectLearner,
  learners = [],
  observations = [],
  loading,
  onSaveObservation,
  onReassignObservation,
}) {
  const [showTypedNote, setShowTypedNote] = useState(false);
  const [banner, setBanner] = useState('');

  const activeLearner = activeLearnerId === 'auto'
    ? { id: 'auto', full_name: 'Auto-detect' }
    : learners.find((item) => item.id === activeLearnerId) || learners[0];

  async function handleTranscribed({ transcript, detectedNames, durationSeconds }) {
    if (activeLearnerId !== 'auto' && activeLearner) {
      // A specific learner is selected in the dock — save straight to them, no AI matching needed.
      await onSaveObservation({ learnerId: activeLearner.id, observationType: 'voice', text: transcript, durationSeconds });
      setBanner(`Saved to ${activeLearner.full_name}.`);
      return;
    }

    const matchedLearners = learners.filter((learner) => detectedNames.includes(learner.full_name));
    if (matchedLearners.length === 0) {
      setBanner("No student name detected — open the pencil icon to save this as a typed note instead.");
      return;
    }
    for (const matched of matchedLearners) {
      await onSaveObservation({ learnerId: matched.id, observationType: 'voice', text: transcript, durationSeconds });
    }
    setBanner(`Saved to: ${matchedLearners.map((m) => m.full_name).join(', ')}.`);
  }

  const recorder = useVoiceRecorder({
    learnerNames: learners.map((learner) => learner.full_name),
    onTranscribed: handleTranscribed,
    onError: (message) => setBanner(message),
  });

  async function saveTypedNote(payload) {
    if (!activeLearner || activeLearner.id === 'auto') return;
    await onSaveObservation({ learnerId: activeLearner.id, ...payload });
    setBanner(`Saved to ${activeLearner.full_name}.`);
  }

  return (
    <section className="capture-shell">
      {banner && (
        <div className="capture-toast" onClick={() => setBanner('')}>
          {banner}
        </div>
      )}

      <div className="capture-feed-area">
        <MemoryFeed
          observations={observations}
          learners={learners}
          activeLearnerId={activeLearnerId}
          loading={loading}
          onReassignObservation={onReassignObservation}
        />
      </div>

      <CaptureDock
        learners={learners}
        activeLearnerId={activeLearnerId}
        onSelectLearner={onSelectLearner}
        isRecording={recorder.isRecording}
        isTranscribing={recorder.isTranscribing}
        timeLeft={recorder.timeLeft}
        onStartRecording={recorder.startRecording}
        onStopRecording={recorder.stopRecording}
        onOpenTypedNote={() => {
          if (activeLearnerId === 'auto') {
            setBanner('Pick a learner from the row above to type a note for them.');
            return;
          }
          setShowTypedNote(true);
        }}
      />

      {showTypedNote && activeLearner && (
        <TypedNoteSheet
          learner={activeLearner}
          loading={loading}
          onSave={saveTypedNote}
          onClose={() => setShowTypedNote(false)}
        />
      )}
    </section>
  );
}
