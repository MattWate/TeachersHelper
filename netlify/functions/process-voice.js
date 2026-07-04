import { GoogleGenAI } from '@google/genai';

// Automatically uses GEMINI_API_KEY from Netlify environment
const ai = new GoogleGenAI({});

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { audioBase64, mimeType } = JSON.parse(event.body || '{}');
    if (!audioBase64) return { statusCode: 400, body: JSON.stringify({ error: 'No audio provided' }) };

    // Gemini 1.5 Flash handles audio files natively and incredibly fast
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            data: audioBase64,
            mimeType: mimeType || 'audio/webm'
          }
        },
        "Please transcribe this classroom observation accurately. Return ONLY the transcribed text, without any conversational filler, markdown formatting, or quotes."
      ]
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: response.text.trim() })
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to transcribe audio.', details: error.message }) };
  }
}
