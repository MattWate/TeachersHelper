export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { audioBase64 } = JSON.parse(event.body || '{}');
    if (!audioBase64) return { statusCode: 400, body: JSON.stringify({ error: 'No audio provided' }) };
    if (!process.env.GEMINI_API_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }) };

    const payload = {
      contents: [{
        parts: [
          { text: "Please transcribe this classroom observation accurately. Return ONLY the transcribed text, without any conversational filler, markdown formatting, or quotes." },
          { inlineData: { mimeType: 'audio/mp3', data: audioBase64 } } // Still forcing mp3 for Gemini's validator
        ]
      }]
    };

    // FIXED: Updated the URL to use the active gemini-2.5-flash model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

    const transcript = data.candidates[0].content.parts[0].text.trim();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
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
