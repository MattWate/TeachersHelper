import { GoogleGenAI, Type } from '@google/genai';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text || typeof text !== 'string') {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'A text field is required.' }) };
    }

    // Safety check
    if (!process.env.GEMINI_API_KEY) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }) };
    }

    // Initialize safely inside the function
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "The primary category of the observation." },
        sentiment: { type: Type.STRING, description: "The sentiment: 'Observation', 'Improvement', 'Development area', 'Positive', 'Concern'." },
        aiSummary: { type: Type.STRING, description: "A very brief, clean summary of the observation (under 180 characters)." }
      },
      required: ["category", "sentiment", "aiSummary"]
    };

    const prompt = `You are a helpful assistant for a teacher. Analyze the following classroom observation about a learner. Extract the core category, the sentiment, and a brief summary. Observation: "${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema, temperature: 0.2 }
    });

    const classification = JSON.parse(response.text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanedText: text.trim(),
        summary: classification.aiSummary,
        category: classification.category,
        sentiment: classification.sentiment,
        aiProvider: 'gemini'
      }),
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Failed to process observation with AI.', details: error.message }) };
  }
}
