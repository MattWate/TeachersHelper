export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { audioBase64, mimeType } = JSON.parse(event.body || '{}');
    if (!audioBase64) return { statusCode: 400, body: JSON.stringify({ error: 'No audio provided' }) };

    // Safety check
    if (!process.env.GEMINI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Netlify.' }) };
    }

    // 1. Dynamic import to prevent server crashes
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 2. Fix the Android Chrome MIME type issue
    // Android sends 'audio/webm;codecs=opus', which Gemini rejects. We strip it to just 'audio/webm'
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0];

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            data: audioBase64,
            mimeType: cleanMimeType
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
