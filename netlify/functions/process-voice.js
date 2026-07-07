export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { audioBase64, learnerNames = [] } = JSON.parse(event.body || '{}');
    if (!audioBase64) return { statusCode: 400, body: JSON.stringify({ error: 'No audio provided' }) };
    if (!process.env.GEMINI_API_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }) };

    const classListString = learnerNames.length > 0 ? learnerNames.join(', ') : 'None provided';

    const payload = {
      contents: [{
        parts: [
          { text: `Transcribe this classroom observation accurately. CRITICAL INSTRUCTION: Use this class list to ensure correct spelling of student names: ${classListString}. Do not add conversational filler. Return a JSON object with two fields: "transcript" (the cleaned text) and "detectedNames" (an array of exact names from the class list that were mentioned in the audio).` },
          { inlineData: { mimeType: 'audio/mp3', data: audioBase64 } } 
        ]
      }],
      generationConfig: {
        temperature: 0.1, // Low temp prevents AI from hallucinating name spellings
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            transcript: { type: "STRING" },
            detectedNames: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["transcript", "detectedNames"]
        }
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

    const result = JSON.parse(data.candidates[0].content.parts[0].text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        transcript: result.transcript.trim(),
        detectedNames: result.detectedNames || []
      })
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to transcribe audio.', details: error.message }) };
  }
}
