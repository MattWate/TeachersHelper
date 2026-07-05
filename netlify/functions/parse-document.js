export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { fileBase64, mimeType } = JSON.parse(event.body || '{}');
    if (!fileBase64) return { statusCode: 400, body: JSON.stringify({ error: 'No file provided' }) };
    if (!process.env.GEMINI_API_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }) };

    const payload = {
      contents: [{
        parts: [
          { text: "Extract all the text from this document. If it contains a list of names or marks, format them cleanly as plain text with line breaks. Do not add markdown formatting or conversational filler." },
          { inlineData: { mimeType: mimeType || 'application/pdf', data: fileBase64 } }
        ]
      }]
    };

    // FIXED: Now correctly pointing to gemini-2.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

    const extractedText = data.candidates[0].content.parts[0].text.trim();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText })
    };
  } catch (error) {
    console.error("Document parse error:", error);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to extract text from document.', details: error.message }) 
    };
  }
}
