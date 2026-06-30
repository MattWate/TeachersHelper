function classifyObservation(text = '') {
  const lower = text.toLowerCase();

  if (lower.includes('read') || lower.includes('reading')) {
    return { category: 'Reading', sentiment: lower.includes('improved') ? 'Improvement' : 'Observation' };
  }

  if (lower.includes('times table') || lower.includes('math') || lower.includes('number')) {
    return { category: 'Maths', sentiment: lower.includes('struggle') || lower.includes('mixed up') ? 'Development area' : 'Observation' };
  }

  if (lower.includes('friend') || lower.includes('helped') || lower.includes('kind')) {
    return { category: 'Social development', sentiment: 'Positive' };
  }

  if (lower.includes('focus') || lower.includes('concentration')) {
    return { category: 'Focus', sentiment: 'Development area' };
  }

  return { category: 'General', sentiment: 'Observation' };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');

    if (!text || typeof text !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'A text field is required.' }),
      };
    }

    const classification = classifyObservation(text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanedText: text.trim(),
        summary: text.trim().slice(0, 180),
        ...classification,
        aiProvider: process.env.GEMINI_API_KEY ? 'gemini-ready' : 'local-rule-poc',
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}
