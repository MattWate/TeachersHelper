import { GoogleGenAI } from '@google/genai';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { audioBase64, mimeType } = JSON.parse(event.body || '{}');
    if (!audioBase64) return { statusCode: 400, body: JSON.stringify({ error: 'No audio provided' }) };

    // Safety check: Ensure the key exists before trying to use it
    if (!process.env.GEMINI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Netlify.' }) };
    }

    // Initialize safely inside the function
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
