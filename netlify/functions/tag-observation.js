export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text) return { statusCode: 400, body: JSON.stringify({ error: 'Text required.' }) };
    if (!process.env.GEMINI_API_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }) };

    const payload = {
      contents: [{ parts: [{ text: `You are a helpful assistant for a teacher. Analyze the following classroom observation about a learner. Extract the core category, the sentiment, and a brief summary. Observation: "${text}"` }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING" },
            sentiment: { type: "STRING" },
            aiSummary: { type: "STRING" }
          },
          required: ["category", "sentiment", "aiSummary"]
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

    const classification = JSON.parse(data.candidates[0].content.parts[0].text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanedText: text.trim(),
        summary: classification.aiSummary,
        category: classification.category,
        sentiment: classification.sentiment,
        aiProvider: 'gemini-rest'
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process observation.', details: error.message }) };
  }
}
