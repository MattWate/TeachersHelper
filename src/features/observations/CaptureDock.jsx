import { Mic, Square, PenLine, Sparkles } from 'lucide-react';
import { getInitials, getAvatarColor } from '../../shared/avatar.js';

export default function CaptureDock({
  learners,
  activeLearnerId,
  onSelectLearner,
  isRecording,
  isTranscribing,
  timeLeft,
  onStartRecording,
  onStopRecording,
  onOpenTypedNote,
}) {
  return (
    <div className="capture-dock">
      <div className="avatar-row" role="tablist" aria-label="Select learner">
        <button
          type="button"
          className={`avatar-chip auto-chip ${activeLearnerId === 'auto' ? 'active' : ''}`}
          onClick={() => onSelectLearner('auto')}
        >
          <span className="avatar-circle auto-circle"><Sparkles size={16} /></span>
          <small>All</small>
        </button>
        {learners.map((learner) => (
          <button
            type="button"
            key={learner.id}
            className={`avatar-chip ${activeLearnerId === learner.id ? 'active' : ''}`}
            onClick={() => onSelectLearner(learner.id)}
          >
            <span className="avatar-circle" style={{ background: getAvatarColor(learner.id) }}>
              {getInitials(learner.full_name)}
            </span>
            <small>{learner.full_name.split(' ')[0]}</small>
          </button>
        ))}
      </div>

      <div className="dock-actions">
        <button
          type="button"
          className="dock-type-button"
          onClick={onOpenTypedNote}
          disabled={isRecording || isTranscribing}
          aria-label="Type a note"
        >
          <PenLine size={20} />
        </button>

        {isTranscribing ? (
          <div className="fab fab-busy" aria-live="polite">
            <span className="pulse-indicator">Transcribing...</span>
          </div>
        ) : isRecording ? (
          <button type="button" className="fab fab-recording" onClick={onStopRecording}>
            <Square size={22} />
            <span className="fab-timer">{timeLeft}s</span>
          </button>
        ) : (
          <button type="button" className="fab fab-idle" onClick={onStartRecording} aria-label="Record a voice note">
            <Mic size={26} />
          </button>
        )}

        <div className="dock-spacer" aria-hidden="true" />
      </div>
    </div>
  );
}
