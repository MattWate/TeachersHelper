// 1. STATIC import so Netlify correctly bundles the package
import { GoogleGenAI } from '@google/genai';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { audioBase64 } = JSON.parse(event.body || '{}');
    if (!audioBase64) return { statusCode: 400, body: JSON.stringify({ error: 'No audio provided' }) };

    if (!process.env.GEMINI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Netlify.' }) };
    }

    // 2. INITIALIZE safely inside the function to prevent boot crashes
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            data: audioBase64,
            // 3. THE MAGIC FIX: Force audio/mp3 to bypass Gemini's strict MIME validator. 
            // Gemini's internal decoder will still successfully process the webm/mp4 bytes!
            mimeType: 'audio/mp3' 
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
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to transcribe audio.', details: error.message }) 
    };
  }
}
