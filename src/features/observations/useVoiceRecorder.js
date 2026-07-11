import { useState, useRef, useEffect } from 'react';

const MAX_SECONDS = 20;

// Handles mic capture, timing, and calling the transcription endpoint.
// Routing the resulting transcript to the right learner(s) is left to the caller.
export function useVoiceRecorder({ learnerNames = [], onTranscribed, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MAX_SECONDS);

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
        stream.getTracks().forEach((track) => track.stop());
        await processAudio(audioBlob, mediaRecorder.mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(MAX_SECONDS);

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
      onError?.('Could not access microphone. Please check your browser permissions.');
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

        const response = await fetch('/.netlify/functions/process-voice', {
          method: 'POST',
          body: JSON.stringify({
            audioBase64: base64data,
            mimeType: mimeType || 'audio/webm',
            learnerNames,
          }),
        });

        const data = await response.json();

        if (response.ok && data.transcript) {
          const durationSeconds = Math.max(1, MAX_SECONDS - timeLeft);
          await onTranscribed?.({ transcript: data.transcript, detectedNames: data.detectedNames || [], durationSeconds });
        } else {
          onError?.(data.details || data.error || 'Unknown server error');
        }
        setIsTranscribing(false);
      };
    } catch (error) {
      console.error('Transcription failed', error);
      onError?.('Failed to transcribe audio: Network or processing error.');
      setIsTranscribing(false);
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return { isRecording, isTranscribing, timeLeft, startRecording, stopRecording };
}
