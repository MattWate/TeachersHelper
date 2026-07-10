import * as XLSX from 'xlsx';

const jsonHeaders = { 'Content-Type': 'application/json' };

function spreadsheetToText(fileBase64) {
  const buffer = Buffer.from(fileBase64, 'base64');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `--- Sheet: ${sheetName} ---\n${csv}`;
  });
  return sheets.join('\n\n');
}

const EXTRACTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    learners: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          extractedName: { type: 'STRING' },
          subjects: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                subject: { type: 'STRING' },
                markDisplay: { type: 'STRING' },
                markValue: { type: 'NUMBER' },
                outOf: { type: 'NUMBER' },
              },
              required: ['subject', 'markDisplay'],
            },
          },
        },
        required: ['extractedName', 'subjects'],
      },
    },
  },
  required: ['learners'],
};

function buildPrompt(learnerNames) {
  return `
    You are extracting learner marks from a document uploaded by a teacher.

    The document may be a spreadsheet exported as CSV text, or a scanned/typed mark sheet.
    It typically lists learners down one axis and subjects/assessment areas across the other,
    with numeric or letter-grade marks in the cells.

    Known learners already in this class (use these to correct obvious spelling/formatting
    differences in names found in the document, but still report the name as it appears in
    the document in "extractedName"):
    ${learnerNames.length ? learnerNames.join(', ') : '(no learner list provided)'}

    Instructions:
    1. Extract every learner row present in the document, and every subject/mark column for each learner.
    2. For each subject mark, set "markDisplay" to the value exactly as shown (e.g. "78", "B+", "Level 4", "Absent").
       Only set "markValue" and "outOf" when the mark is genuinely numeric (e.g. 78 out of 100). Leave them out otherwise.
    3. Normalise obvious subject header variants to a clean subject name (e.g. "ENG HL", "Eng." -> "English").
    4. Do not invent learners, subjects, or marks that are not present in the document.
    5. Skip rows that are clearly headers, totals, or averages rather than individual learners.
  `;
}

async function callGemini(parts, learnerNames) {
  const payload = {
    contents: [{ parts: [{ text: buildPrompt(learnerNames) }, ...parts] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: EXTRACTION_SCHEMA,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

  return JSON.parse(data.candidates[0].content.parts[0].text.trim());
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { fileBase64, textContent, mimeType, learnerNames } = JSON.parse(event.body || '{}');
    if (!fileBase64 && !textContent) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'No file content provided' }) };
    }
    if (!process.env.GEMINI_API_KEY) {
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }) };
    }

    const names = Array.isArray(learnerNames) ? learnerNames : [];
    const isSpreadsheet =
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel';
    const isPdf = mimeType === 'application/pdf';

    let extraction;

    if (isPdf) {
      extraction = await callGemini(
        [{ inlineData: { mimeType, data: fileBase64 } }],
        names
      );
    } else if (isSpreadsheet) {
      const csvText = spreadsheetToText(fileBase64);
      extraction = await callGemini([{ text: `Document contents (converted from spreadsheet):\n${csvText}` }], names);
    } else {
      const text = textContent || Buffer.from(fileBase64, 'base64').toString('utf-8');
      extraction = await callGemini([{ text: `Document contents:\n${text}` }], names);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ learners: extraction.learners || [] }),
    };
  } catch (error) {
    console.error('Marks extraction error:', error);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Failed to extract marks from document.', details: error.message }),
    };
  }
}
