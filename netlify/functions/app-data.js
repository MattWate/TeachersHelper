import { neon } from '@neondatabase/serverless';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

function requireDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured. Add your Neon pooled connection string in Netlify.');
  }

  return neon(process.env.DATABASE_URL);
}

function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getWeekStartDate(date = new Date()) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy.toISOString().slice(0, 10);
}

async function classifyObservation(text = '') {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing. Using default tags.");
      return { category: 'General', sentiment: 'Observation', summary: text.slice(0, 180) };
    }

    const payload = {
      contents: [{ parts: [{ text: `Analyze this classroom observation and extract the core category, sentiment (Observation/Improvement/Development area/Positive/Concern), and a short summary (under 180 chars). Observation: "${text}"` }] }],
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
    if (!response.ok) throw new Error(data.error?.message || 'API Error');

    const resultText = data.candidates[0].content.parts[0].text;
    const classification = JSON.parse(resultText);
    
    return {
      category: classification.category || 'General',
      sentiment: classification.sentiment || 'Observation',
      summary: classification.aiSummary || text.slice(0, 180)
    };
  } catch (err) {
    console.error('Gemini REST classification failed:', err);
    return { category: 'General', sentiment: 'Observation', summary: text.slice(0, 180) };
  }
}

async function getProfile(sql, email, fullName) {
  const cleanEmail = normaliseEmail(email);

  if (!cleanEmail) {
    throw new Error('Email is required.');
  }

  const rows = await sql`
    insert into profiles (email, full_name, subscription_status)
    values (${cleanEmail}, ${fullName || cleanEmail}, 'tester')
    on conflict (email)
    do update set
      full_name = coalesce(nullif(${fullName || ''}, ''), profiles.full_name),
      updated_at = now()
    returning *
  `;

  return rows[0];
}

async function loadDashboard(sql, profileId) {
  const weekStart = getWeekStartDate();

  const [classes, learners, observations, reportStructures, usageRows, marks] = await Promise.all([
    sql`select * from classes where profile_id = ${profileId} order by created_at asc`,
    sql`
      select learners.*
      from learners
      join classes on classes.id = learners.class_id
      where classes.profile_id = ${profileId}
      order by learners.full_name asc
    `,
    sql`select * from observations where profile_id = ${profileId} order by created_at desc limit 500`,
    sql`select * from report_structures where profile_id = ${profileId} order by created_at desc`,
    sql`select * from voice_usage where profile_id = ${profileId} and week_start_date = ${weekStart}`,
    sql`select * from marks where profile_id = ${profileId} order by created_at desc`,
  ]);

  const usage = usageRows[0] || {
    week_start_date: weekStart,
    voice_note_count: 0,
    seconds_used: 0,
  };

  return {
    classes,
    learners,
    observations,
    reportStructures,
    usage,
    marks,
  };
}

async function bootstrap(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);
  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

async function createClass(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);
  const rows = await sql`
    insert into classes (profile_id, name, grade, academic_year, term)
    values (${profile.id}, ${payload.name}, ${payload.grade || null}, ${payload.academicYear || new Date().getFullYear().toString()}, ${payload.term || null})
    returning *
  `;

  await sql`
    insert into report_structures (profile_id, class_id, name, tone, sections_json)
    values (
      ${profile.id},
      ${rows[0].id},
      'Default report structure',
      'Warm, specific and professional',
      ${JSON.stringify([
        { id: 'english', name: 'English', minWords: 60, maxWords: 90 },
        { id: 'maths', name: 'Maths', minWords: 60, maxWords: 90 },
        { id: 'general', name: 'General Comment', minWords: 80, maxWords: 120 },
      ])}::jsonb
    )
  `;

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

async function createLearner(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  if (!payload.classId || !payload.learnerName) {
    throw new Error('classId and learnerName are required.');
  }

  const classRows = await sql`select * from classes where id = ${payload.classId} and profile_id = ${profile.id}`;
  if (!classRows[0]) throw new Error('Class not found for this teacher.');

  await sql`
    insert into learners (class_id, full_name, preferred_name, pronouns)
    values (${payload.classId}, ${payload.learnerName}, ${payload.preferredName || payload.learnerName}, ${payload.pronouns || null})
  `;

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

async function createLearners(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  if (!payload.classId || !payload.names || !payload.names.length) {
    throw new Error('classId and a list of names are required.');
  }

  const classRows = await sql`select * from classes where id = ${payload.classId} and profile_id = ${profile.id}`;
  if (!classRows[0]) throw new Error('Class not found for this teacher.');

  // Process all names in a single, lightning-fast database connection
  for (const name of payload.names) {
    const cleanName = String(name).trim();
    if (cleanName) {
      await sql`
        insert into learners (class_id, full_name, preferred_name)
        values (${payload.classId}, ${cleanName}, ${cleanName})
      `;
    }
  }

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

async function addObservation(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  if (!payload.classId || !payload.learnerId || !payload.text) {
    throw new Error('classId, learnerId and text are required.');
  }

  const observationType = payload.observationType === 'voice' ? 'voice' : 'typed';
  const weekStart = getWeekStartDate();

  if (observationType === 'voice') {
    const usageRows = await sql`
      insert into voice_usage (profile_id, week_start_date, voice_note_count, seconds_used)
      values (${profile.id}, ${weekStart}, 0, 0)
      on conflict (profile_id, week_start_date)
      do update set profile_id = excluded.profile_id
      returning *
    `;

    if ((usageRows[0]?.voice_note_count || 0) >= 100) {
      throw new Error('Weekly voice observation limit reached. Typed notes are still unlimited.');
    }
  }

  const classification = await classifyObservation(payload.text);

  await sql`
    insert into observations (
      profile_id,
      class_id,
      learner_id,
      observation_type,
      original_text,
      cleaned_text,
      ai_summary,
      category,
      subject,
      sentiment,
      importance
    ) values (
      ${profile.id},
      ${payload.classId},
      ${payload.learnerId},
      ${observationType},
      ${payload.text},
      ${payload.text.trim()},
      ${classification.summary},
      ${classification.category},
      ${payload.subject || classification.category},
      ${classification.sentiment},
      ${payload.importance || 'normal'}
    )
  `;

  if (observationType === 'voice') {
    await sql`
      update voice_usage
      set voice_note_count = voice_note_count + 1,
          seconds_used = seconds_used + ${Math.min(Number(payload.durationSeconds || 20), 20)}
      where profile_id = ${profile.id} and week_start_date = ${weekStart}
    `;
  }

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

// --- NOW IT IS OUTSIDE, IN THE MAIN SCOPE! ---
async function reassignObservation(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  if (!payload.observationId || !payload.newLearnerId) {
    throw new Error('observationId and newLearnerId are required.');
  }

  // Update the observation to point to the new learner
  await sql`
    update observations
    set learner_id = ${payload.newLearnerId}, updated_at = now()
    where id = ${payload.observationId} and profile_id = ${profile.id}
  `;

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}
// ---------------------------------------------
async function saveMarks(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  if (!payload.classId || !Array.isArray(payload.marks) || !payload.marks.length) {
    throw new Error('classId and at least one confirmed mark are required.');
  }

  const classRows = await sql`select * from classes where id = ${payload.classId} and profile_id = ${profile.id}`;
  if (!classRows[0]) throw new Error('Class not found for this teacher.');

  const uploadRows = await sql`
    insert into mark_uploads (profile_id, class_id, file_name, period_label, term, academic_year, status, raw_extract_json)
    values (
      ${profile.id},
      ${payload.classId},
      ${payload.fileName || null},
      ${payload.periodLabel || null},
      ${payload.term || null},
      ${payload.academicYear || null},
      'confirmed',
      ${JSON.stringify(payload.marks)}::jsonb
    )
    returning *
  `;
  const uploadId = uploadRows[0].id;

  for (const mark of payload.marks) {
    if (!mark.learnerId || !mark.subject) continue;

    const learnerRows = await sql`
      select learners.* from learners
      join classes on classes.id = learners.class_id
      where learners.id = ${mark.learnerId} and classes.id = ${payload.classId} and classes.profile_id = ${profile.id}
    `;
    if (!learnerRows[0]) continue;

    await sql`
      insert into marks (
        profile_id, class_id, learner_id, mark_upload_id, subject,
        mark_display, mark_value, out_of, period_label, term, academic_year
      ) values (
        ${profile.id}, ${payload.classId}, ${mark.learnerId}, ${uploadId}, ${mark.subject},
        ${mark.markDisplay || null}, ${mark.markValue ?? null}, ${mark.outOf ?? null},
        ${payload.periodLabel || null}, ${payload.term || null}, ${payload.academicYear || null}
      )
    `;
  }

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}
// ---------------------------------------------
async function generateReport(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  const learnerRows = await sql`
    select learners.* from learners
    join classes on classes.id = learners.class_id
    where learners.id = ${payload.learnerId} and classes.profile_id = ${profile.id}
  `;

  if (!learnerRows[0]) throw new Error('Learner not found for this teacher.');

  const observationRows = await sql`
    select * from observations
    where profile_id = ${profile.id} and learner_id = ${payload.learnerId}
    order by created_at desc
  `;

  const markRows = await sql`
    select * from marks
    where profile_id = ${profile.id} and learner_id = ${payload.learnerId}
    order by created_at desc
  `;

  const structureRows = await sql`
    select * from report_structures
    where profile_id = ${profile.id} and (class_id = ${learnerRows[0].class_id} or class_id is null)
    order by class_id nulls last, created_at desc
    limit 1
  `;

  // Standardize the structure if none exists
  const reportStructure = structureRows[0]
    ? { sections: structureRows[0].sections_json, tone: structureRows[0].tone }
    : {
        tone: 'Warm, specific and professional',
        sections: [
          { id: 'english', name: 'English', minWords: 60, maxWords: 90 },
          { id: 'maths', name: 'Maths', minWords: 60, maxWords: 90 },
          { id: 'general', name: 'General Comment', minWords: 80, maxWords: 120 },
        ],
      };

  const preferredName = learnerRows[0].preferred_name || learnerRows[0].full_name;

  // 1. THE AI PROMPT
  const promptText = `
    You are an expert teacher's assistant.
    Write a "${payload.timeframe || 'End of Term Report'}" for the learner named ${preferredName}.

    Here are the teacher's classroom observations over this period:
    ${observationRows.length > 0 ? observationRows.map(o => `- [${o.category}] ${o.cleaned_text}`).join('\n') : 'No observations recorded yet.'}

    Here are the learner's saved marks on record${payload.periodLabel ? ` (focused on: ${payload.periodLabel})` : ''}:
    ${markRows.length > 0 ? markRows.map((m) => `- ${m.subject}: ${m.mark_display || m.mark_value}${m.period_label ? ` (${m.period_label})` : ''}`).join('\n') : 'No marks on record.'}

    Here is any additional free-text context or marks the teacher pasted in for this report:
    ${payload.contextMarks || 'No additional context provided.'}

    Report Structure and Tone:
    Tone: ${reportStructure.tone}
    Sections required: ${JSON.stringify(reportStructure.sections)}

    Instructions:
    1. Write the report draft. Ensure you strictly use the observations and marks as evidence.
    2. Do not invent events, fabricate behaviors, or make up grades.
    3. CRITICAL: Include BOTH positive achievements AND any negative, constructive, or concerning observations. Do not filter out struggles or development areas.
    4. If a section lacks evidence entirely, write a brief, general statement matching the requested tone. Then, use the "questions" array to suggest 1-2 specific things the teacher could observe next time to improve this section.
  `;
  
  // 2. CALL GEMINI
  const geminiPayload = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          sections: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { sectionName: { type: "STRING" }, text: { type: "STRING" } },
              required: ["sectionName", "text"]
            }
          },
          questions: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["sections", "questions"]
      }
    }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiPayload)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

  const draftResult = JSON.parse(data.candidates[0].content.parts[0].text);

  const draft = {
    learnerId: learnerRows[0].id,
    learnerName: learnerRows[0].full_name,
    timeframe: payload.timeframe || 'End of Term Report',
    sections: draftResult.sections || [],
    questions: draftResult.questions || [],
  };

  // 3. SAVE TO NEON
  await sql`
    insert into report_drafts (profile_id, class_id, learner_id, report_structure_id, draft_json, final_text, status)
    values (
      ${profile.id},
      ${learnerRows[0].class_id},
      ${learnerRows[0].id},
      ${structureRows[0]?.id || null},
      ${JSON.stringify(draft)}::jsonb,
      ${draft.sections.map((section) => `${section.sectionName}\n${section.text}`).join('\n\n')},
      'draft'
    )
  `;

  return { draft };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const sql = requireDatabase();
    const payload = JSON.parse(event.body || '{}');
    const action = payload.action;

    if (action === 'bootstrap') return json(200, await bootstrap(sql, payload));
    if (action === 'createClass') return json(200, await createClass(sql, payload));
    if (action === 'createLearner') return json(200, await createLearner(sql, payload));
    if (action === 'createLearners') return json(200, await createLearners(sql, payload));
    if (action === 'addObservation') return json(200, await addObservation(sql, payload));
    if (action === 'reassignObservation') return json(200, await reassignObservation(sql, payload));
    if (action === 'saveMarks') return json(200, await saveMarks(sql, payload));
    if (action === 'generateReport') return json(200, await generateReport(sql, payload));

    return json(400, { error: `Unknown action: ${action}` });
  } catch (error) {
    return json(500, { error: error.message });
  }
}
